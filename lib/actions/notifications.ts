'use server'
import { createServiceClient } from '@/lib/supabase/server'
import type { Notification, ActionResult } from '@/types'

export async function createNotification(
  userClerkId: string,
  eventType: string,
  message: string
): Promise<void> {
  const supabase = await createServiceClient()
  await supabase.from('notifications').insert({
    user_clerk_id: userClerkId,
    event_type: eventType,
    message,
    read: false,
  })
}

export async function getNotifications(userClerkId: string): Promise<ActionResult<Notification[]>> {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_clerk_id', userClerkId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) return { success: false, error: error.message }
    return { success: true, data: data ?? [] }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  try {
    const supabase = await createServiceClient()
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function markAllNotificationsRead(userClerkId: string): Promise<ActionResult> {
  try {
    const supabase = await createServiceClient()
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_clerk_id', userClerkId)
      .eq('read', false)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export async function notifyUsersByRole(
  role: string,
  branchId: string | null,
  eventType: string,
  message: string
): Promise<void> {
  const supabase = await createServiceClient()
  let query = supabase
    .from('users')
    .select('clerk_user_id')
    .eq('role', role)
    .eq('active', true)
  if (branchId) {
    query = query.eq('branch_id', branchId)
  }
  const { data: users } = await query
  if (!users || users.length === 0) return
  const notifications = users.map((u) => ({
    user_clerk_id: u.clerk_user_id,
    event_type: eventType,
    message,
    read: false,
  }))
  await supabase.from('notifications').insert(notifications)
}
