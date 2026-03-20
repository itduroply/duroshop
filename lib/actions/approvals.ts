'use server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { notifyUsersByRole, createNotification } from './notifications'
import type { ActionResult, Requisition, ApproverRole } from '@/types'

function getApprovalPath(recipientType: string): ApproverRole[] {
  if (recipientType === 'employee') return ['manager', 'hr']
  return ['manager']
}

export async function getPendingApprovals(
  role: ApproverRole,
  branchId?: string
): Promise<ActionResult<Requisition[]>> {
  try {
    const supabase = await createServiceClient()
    const status = role === 'manager' ? 'manager_pending' : 'hr_pending'
    let query = supabase
      .from('requisitions')
      .select(
        'id, status, created_at, recipient_type, reason, branch_id, branch:branches(name), lines:requisition_lines(id, requested_qty, approved_qty, item:pop_items(id, name, unit)), approval_steps(id, approver_role, action)'
      )
      .eq('status', status)
      .order('created_at', { ascending: true })
    if (branchId) query = query.eq('branch_id', branchId)
    const { data, error } = await query
    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as Requisition[] }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function approveRequisition(params: {
  requisitionId: string
  approverRole: ApproverRole
  approvedLines: { lineId: string; approvedQty: number }[]
  remarks?: string
}): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }
    const userId = session.userId
    const supabase = await createServiceClient()
    const { data: req, error: reqErr } = await supabase
      .from('requisitions')
      .select('*, lines:requisition_lines(*)')
      .eq('id', params.requisitionId)
      .single()
    if (reqErr || !req) return { success: false, error: reqErr?.message ?? 'Not found' }

    await supabase.from('approval_steps').insert({
      requisition_id: params.requisitionId,
      approver_role: params.approverRole,
      approver_clerk_id: userId,
      action: 'approved',
      remarks: params.remarks ?? null,
    })

    await Promise.all(
      params.approvedLines.map((line) =>
        supabase
          .from('requisition_lines')
          .update({ approved_qty: line.approvedQty })
          .eq('id', line.lineId)
      )
    )

    const path = getApprovalPath(req.recipient_type)
    const isLastStep = params.approverRole === path[path.length - 1]

    if (isLastStep) {
      await supabase
        .from('requisitions')
        .update({ status: 'approved' })
        .eq('id', params.requisitionId)
      await notifyUsersByRole(
        'dispatch',
        req.branch_id,
        'requisition_approved',
        `Requisition #${params.requisitionId.slice(0, 8).toUpperCase()} is approved and ready for dispatch.`
      )
      await createNotification(
        req.requestor_clerk_id,
        'requisition_approved',
        `Your requisition #${params.requisitionId.slice(0, 8).toUpperCase()} has been fully approved!`
      )
    } else {
      await supabase
        .from('requisitions')
        .update({ status: 'hr_pending' })
        .eq('id', params.requisitionId)
      await notifyUsersByRole(
        'hr',
        req.branch_id,
        'requisition_hr_pending',
        `Requisition #${params.requisitionId.slice(0, 8).toUpperCase()} needs your HR approval.`
      )
    }

    revalidatePath('/manager/approvals')
    revalidatePath('/hr/approvals')
    revalidatePath('/dispatch/dashboard')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function rejectRequisition(params: {
  requisitionId: string
  approverRole: ApproverRole
  remarks: string
}): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }
    const userId = session.userId
    const supabase = await createServiceClient()
    const { data: req } = await supabase
      .from('requisitions')
      .select('requestor_clerk_id, branch_id')
      .eq('id', params.requisitionId)
      .single()

    await supabase.from('approval_steps').insert({
      requisition_id: params.requisitionId,
      approver_role: params.approverRole,
      approver_clerk_id: userId,
      action: 'rejected',
      remarks: params.remarks,
    })
    await supabase
      .from('requisitions')
      .update({ status: 'rejected' })
      .eq('id', params.requisitionId)

    if (req) {
      await createNotification(
        req.requestor_clerk_id,
        'requisition_rejected',
        `Your requisition #${params.requisitionId.slice(0, 8).toUpperCase()} was rejected. Reason: ${params.remarks}`
      )
    }

    revalidatePath('/manager/approvals')
    revalidatePath('/hr/approvals')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
