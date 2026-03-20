'use server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createNotification } from './notifications'
import type { ActionResult, Distribution, Recipient, Requisition } from '@/types'

export async function getApprovedRequisitions(branchId?: string): Promise<ActionResult<Requisition[]>> {
  try {
    const supabase = await createServiceClient()
    let query = supabase
      .from('requisitions')
      .select('*, branch:branches(*), lines:requisition_lines(*, item:pop_items(*)), approval_steps(*)')
      .eq('status', 'approved')
      .order('created_at', { ascending: true })
    if (branchId) query = query.eq('branch_id', branchId)
    const { data, error } = await query
    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as Requisition[] }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function getRecipients(type?: string, branchId?: string): Promise<ActionResult<Recipient[]>> {
  try {
    const supabase = await createServiceClient()
    let query = supabase.from('recipients').select('*').eq('active', true).order('name')
    if (type) query = query.eq('type', type)
    if (branchId) query = query.eq('branch_id', branchId)
    const { data, error } = await query
    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as Recipient[] }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function dispatchRequisition(params: {
  requisitionId: string
  recipientId: string
  notes?: string
}): Promise<ActionResult<Distribution>> {
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
    if (req.status !== 'approved') return { success: false, error: 'Requisition is not approved' }

    const { data: dist, error: distErr } = await supabase
      .from('distributions')
      .insert({
        requisition_id: params.requisitionId,
        distributor_clerk_id: userId,
        recipient_id: params.recipientId,
        notes: params.notes ?? null,
      })
      .select('*, recipient:recipients(*)')
      .single()
    if (distErr) return { success: false, error: distErr.message }

    for (const line of req.lines ?? []) {
      const qty = line.approved_qty ?? line.requested_qty
      const { data: inv } = await supabase
        .from('inventory')
        .select('*')
        .eq('branch_id', req.branch_id)
        .eq('item_id', line.item_id)
        .single()
      if (inv) {
        const newAvailable = Math.max(0, inv.available_qty - qty)
        const newIssued = inv.issued_qty + qty
        await supabase
          .from('inventory')
          .update({ available_qty: newAvailable, issued_qty: newIssued, updated_at: new Date().toISOString() })
          .eq('id', inv.id)
        await supabase.from('inventory_audit').insert({
          branch_id: req.branch_id,
          item_id: line.item_id,
          actor_clerk_id: userId,
          action: 'issue',
          qty_before: inv.available_qty,
          qty_after: newAvailable,
          reason: `Dispatched for requisition #${params.requisitionId.slice(0, 8).toUpperCase()}`,
        })
      }
    }

    await supabase.from('requisitions').update({ status: 'closed' }).eq('id', params.requisitionId)
    await createNotification(
      req.requestor_clerk_id,
      'requisition_dispatched',
      `Your requisition #${params.requisitionId.slice(0, 8).toUpperCase()} has been dispatched and closed.`
    )

    revalidatePath('/dispatch/dashboard')
    revalidatePath('/employee/my-requests')
    revalidatePath('/branch-admin/inventory')
    return { success: true, data: dist as Distribution }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function createRecipient(params: {
  name: string
  type: 'employee' | 'architect' | 'dealer'
  branchId: string
  contact?: string
}): Promise<ActionResult<Recipient>> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('recipients')
      .insert({
        name: params.name,
        type: params.type,
        branch_id: params.branchId,
        contact: params.contact ?? null,
      })
      .select('*')
      .single()
    if (error) return { success: false, error: error.message }
    revalidatePath('/branch-admin/distribution')
    return { success: true, data: data as Recipient }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
