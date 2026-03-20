'use server'
import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { User, ActionResult, UserRole } from '@/types'

export async function getUsers(branchId?: string): Promise<ActionResult<User[]>> {
  try {
    const supabase = await createServiceClient()
    let query = supabase
      .from('users')
      .select('*, branch:branches(*)')
      .eq('active', true)
      .order('name')
    if (branchId) query = query.eq('branch_id', branchId)
    const { data, error } = await query
    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as User[] }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function getUserByClerkId(clerkUserId: string): Promise<ActionResult<User>> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('users')
      .select('*, branch:branches(*)')
      .eq('clerk_user_id', clerkUserId)
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data: data as User }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function upsertUser(params: {
  clerkUserId: string
  name: string
  email: string
  role: UserRole
  branchId?: string
}): Promise<ActionResult<User>> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          clerk_user_id: params.clerkUserId,
          name: params.name,
          email: params.email,
          role: params.role,
          branch_id: params.branchId ?? null,
        },
        { onConflict: 'clerk_user_id' }
      )
      .select('*')
      .single()
    if (error) return { success: false, error: error.message }
    revalidatePath('/super-admin/users')
    return { success: true, data: data as User }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function createUser(params: {
  name: string
  email: string
  role: UserRole
  branchId?: string
}): Promise<ActionResult<User>> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: params.name,
        email: params.email,
        role: params.role,
        branch_id: params.branchId ?? null,
        active: true,
      })
      .select('*')
      .single()
    if (error) return { success: false, error: error.message }
    revalidatePath('/super-admin/users')
    return { success: true, data: data as User }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function deactivateUser(id: string): Promise<ActionResult> {
  try {
    const supabase = await createServiceClient()
    const { error } = await supabase.from('users').update({ active: false }).eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/super-admin/users')
    revalidatePath('/branch-admin/users')
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
