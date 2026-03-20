import { createClient } from '@/lib/supabase/server'
import { User } from '@/types'

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()
  
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !authUser) {
    return null
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (userError || !user) {
    return null
  }

  return user as User
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
