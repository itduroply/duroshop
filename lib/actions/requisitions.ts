'use server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { notifyUsersByRole, createNotification } from './notifications'
import type { Requisition, ActionResult, CartItem, RequisitionStatus } from '@/types'

export async function createRequisition(params: {
  branchId: string
  recipientType: 'employee' | 'architect' | 'dealer'
  reason: string
  items: CartItem[]
}): Promise<ActionResult<Requisition>> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }
    const userId = session.userId
    const supabase = await createServiceClient()
    const autoVoidAt = new Date()
    autoVoidAt.setDate(autoVoidAt.getDate() + 7)
    const { data: req, error } = await supabase
      .from('requisitions')
      .insert({
        requestor_clerk_id: userId,
        branch_id: params.branchId,
        recipient_type: params.recipientType,
        reason: params.reason,
        status: 'manager_pending',
        auto_void_at: autoVoidAt.toISOString(),
      })
      .select('*')
      .single()
    if (error) return { success: false, error: error.message }
    const lines = params.items.map((ci) => ({
      requisition_id: req.id,
      item_id: ci.item.id,
      requested_qty: ci.quantity,
    }))
    await supabase.from('requisition_lines').insert(lines)
    await notifyUsersByRole(
      'manager',
      params.branchId,
      'requisition_submitted',
      `New requisition #${req.id.slice(0, 8).toUpperCase()} submitted and requires your approval.`
    )
    revalidatePath('/employee/my-requests')
    revalidatePath('/manager/approvals')
    return { success: true, data: req as Requisition }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function getRequisitions(filters?: {
  status?: RequisitionStatus
  branchId?: string
  requestorClerkId?: string
}): Promise<ActionResult<Requisition[]>> {
  try {
    const supabase = await createServiceClient()
    let query = supabase
      .from('requisitions')
      .select(
        '*, branch:branches(*), lines:requisition_lines(*, item:pop_items(*, category:categories(*))), approval_steps(*)'
      )
      .order('created_at', { ascending: false })
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.branchId) query = query.eq('branch_id', filters.branchId)
    if (filters?.requestorClerkId) query = query.eq('requestor_clerk_id', filters.requestorClerkId)
    const { data, error } = await query
    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as Requisition[] }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function getRequisitionById(id: string): Promise<ActionResult<Requisition>> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('requisitions')
      .select(
        '*, branch:branches(*), lines:requisition_lines(*, item:pop_items(*, category:categories(*))), approval_steps(*), distribution:distributions(*, recipient:recipients(*))'
      )
      .eq('id', id)
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data: data as Requisition }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function getMyRequisitions(): Promise<ActionResult<Requisition[]>> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }
    return getRequisitions({ requestorClerkId: session.userId })
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function voidStaleRequisitions(): Promise<ActionResult<number>> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('requisitions')
      .update({ status: 'voided' })
      .lt('auto_void_at', new Date().toISOString())
      .in('status', ['manager_pending', 'hr_pending'])
      .select('id, requestor_clerk_id')
    if (error) return { success: false, error: error.message }
    if (data) {
      await Promise.all(
        data.map((req) =>
          createNotification(
            req.requestor_clerk_id,
            'requisition_voided',
            `Requisition #${req.id.slice(0, 8).toUpperCase()} was automatically voided due to inactivity.`
          )
        )
      )
    }
    return { success: true, data: data?.length ?? 0 }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
