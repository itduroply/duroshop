'use server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Inventory, InventoryAudit, PopItem, Category, ActionResult } from '@/types'

export async function getInventoryByBranch(branchId: string): Promise<ActionResult<Inventory[]>> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('inventory')
      .select('*, item:pop_items(*, category:categories(*))')
      .eq('branch_id', branchId)
      .order('updated_at', { ascending: false })
    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as Inventory[] }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function getAllInventory(): Promise<ActionResult<Inventory[]>> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('inventory')
      .select('*, branch:branches(*), item:pop_items(*, category:categories(*))')
      .order('updated_at', { ascending: false })
    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as Inventory[] }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function receiveStock(
  branchId: string,
  itemId: string,
  quantity: number,
  reason: string
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }
    const userId = session.userId
    const supabase = await createServiceClient()
    const { data: inv } = await supabase
      .from('inventory')
      .select('*')
      .eq('branch_id', branchId)
      .eq('item_id', itemId)
      .single()
    const currentQty = inv?.available_qty ?? 0
    const newQty = currentQty + quantity
    if (inv) {
      await supabase
        .from('inventory')
        .update({ available_qty: newQty, updated_at: new Date().toISOString() })
        .eq('id', inv.id)
    } else {
      await supabase
        .from('inventory')
        .insert({ branch_id: branchId, item_id: itemId, available_qty: newQty })
    }
    await supabase.from('inventory_audit').insert({
      branch_id: branchId,
      item_id: itemId,
      actor_clerk_id: userId,
      action: 'receive',
      qty_before: currentQty,
      qty_after: newQty,
      reason,
    })
    revalidatePath('/branch-admin/inventory')
    revalidatePath('/super-admin/inventory')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function adjustStock(
  branchId: string,
  itemId: string,
  newQty: number,
  reason: string
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }
    const userId = session.userId
    const supabase = await createServiceClient()
    const { data: inv } = await supabase
      .from('inventory')
      .select('*')
      .eq('branch_id', branchId)
      .eq('item_id', itemId)
      .single()
    const currentQty = inv?.available_qty ?? 0
    if (inv) {
      await supabase
        .from('inventory')
        .update({ available_qty: newQty, updated_at: new Date().toISOString() })
        .eq('id', inv.id)
    } else {
      await supabase
        .from('inventory')
        .insert({ branch_id: branchId, item_id: itemId, available_qty: newQty })
    }
    await supabase.from('inventory_audit').insert({
      branch_id: branchId,
      item_id: itemId,
      actor_clerk_id: userId,
      action: 'adjustment',
      qty_before: currentQty,
      qty_after: newQty,
      reason,
    })
    revalidatePath('/branch-admin/inventory')
    revalidatePath('/super-admin/inventory')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function getAuditLog(branchId?: string): Promise<ActionResult<InventoryAudit[]>> {
  try {
    const supabase = await createServiceClient()
    let query = supabase
      .from('inventory_audit')
      .select('*, branch:branches(*), item:pop_items(*)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (branchId) query = query.eq('branch_id', branchId)
    const { data, error } = await query
    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as InventoryAudit[] }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function getPopItems(): Promise<ActionResult<PopItem[]>> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('pop_items')
      .select('*, category:categories(*)')
      .eq('active', true)
      .order('name')
    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as PopItem[] }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function createPopItem(formData: {
  name: string
  sku: string
  category_id: string
  unit: string
  description: string
  image_url?: string
}): Promise<ActionResult<PopItem>> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('pop_items')
      .insert(formData)
      .select('*, category:categories(*)')
      .single()
    if (error) return { success: false, error: error.message }
    revalidatePath('/super-admin/inventory')
    return { success: true, data: data as PopItem }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function getCategories(): Promise<ActionResult<Category[]>> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase.from('categories').select('*').order('name')
    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as Category[] }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
