'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { clearCurrentUserCache } from '@/hooks/use-current-user'

export default function LogoutPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const logout = async () => {
      try {
        await supabase.auth.signOut()
      } catch {
        // Sign-out failed — proceed with redirect anyway
      }

      // Clear caches
      clearCurrentUserCache()
      sessionStorage.removeItem('sidebar_permissions')

      // Clear all cookies
      document.cookie.split(';').forEach((c) => {
        const eqPos = c.indexOf('=')
        const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim()
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=${window.location.hostname}`
      })

      router.push('/login')
      router.refresh()
    }

    logout()
  }, [router, supabase])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Logging out...</h1>
        <p className="text-gray-500">Clearing session and redirecting...</p>
      </div>
    </div>
  )
}
