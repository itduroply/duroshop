'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface CurrentUser {
  id: string
  email: string
  full_name: string
  role_id: string
  role_name: string
  branch_id: string | null
}

let cached: CurrentUser | null = null
let cacheTime = 0
const CACHE_TTL = 60_000 // 1 minute

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(cached)
  const [loading, setLoading] = useState(!cached || Date.now() - cacheTime > CACHE_TTL)

  useEffect(() => {
    if (cached && Date.now() - cacheTime < CACHE_TTL) {
      setUser(cached)
      setLoading(false)
      return
    }

    const supabase = createClient()
    
    const fetchUser = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        if (authError || !authUser) { setLoading(false); return }

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id, email, full_name, role_id, branch_id, roles:role_id ( name )')
          .eq('id', authUser.id)
          .single()

        if (profileError || !profile) { setLoading(false); return }

        const currentUser: CurrentUser = {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role_id: profile.role_id,
          role_name: (profile.roles as any)?.name || '',
          branch_id: profile.branch_id,
        }
        cached = currentUser
        cacheTime = Date.now()
        setUser(currentUser)
      } catch {
        // no-op — loading will be cleared below
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  return { user, loading }
}

/** Clear the cached user (call on logout) */
export function clearCurrentUserCache() {
  cached = null
  cacheTime = 0
}
