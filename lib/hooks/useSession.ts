'use client'
import { useState, useEffect } from 'react'

export interface ClientSession {
  userId: string
  name: string
  role: string
  branchId?: string
  branchName?: string
}

export function useSession() {
  const [session, setSession] = useState<ClientSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        setSession(data.session ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return { session, loading }
}
