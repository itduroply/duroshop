'use server'
import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Branch, ActionResult } from '@/types'

export async function getBranches(): Promise<ActionResult<Branch[]>> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name')
    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as Branch[] }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function getBranchById(id: string): Promise<ActionResult<Branch>> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase.from('branches').select('*').eq('id', id).single()
    if (error) return { success: false, error: error.message }
    return { success: true, data: data as Branch }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function createBranch(params: {
  name: string
  region?: string
  address?: string
}): Promise<ActionResult<Branch>> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('branches')
      .insert({ name: params.name, region: params.region ?? null, address: params.address ?? null })
      .select('*')
      .single()
    if (error) return { success: false, error: error.message }
    revalidatePath('/super-admin/branches')
    return { success: true, data: data as Branch }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function updateBranch(id: string, params: Partial<Branch>): Promise<ActionResult<Branch>> {
  try {
    const supabase = await createServiceClient()
    const { id: _id, created_at: _ca, ...updateData } = params
    const { data, error } = await supabase
      .from('branches')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single()
    if (error) return { success: false, error: error.message }
    revalidatePath('/super-admin/branches')
    return { success: true, data: data as Branch }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function deactivateBranch(id: string): Promise<ActionResult> {
  try {
    const supabase = await createServiceClient()
    const { error } = await supabase.from('branches').update({ active: false }).eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/super-admin/branches')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
