'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Requisition, RequisitionStatus } from '@/types'

export function useRequisitions(filters?: {
  status?: RequisitionStatus
  branchId?: string
  requestorClerkId?: string
}) {
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRequisitions = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('requisitions')
      .select('*, branch:branches(*), lines:requisition_lines(*, item:pop_items(*)), approval_steps(*)')
      .order('created_at', { ascending: false })
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.branchId) query = query.eq('branch_id', filters.branchId)
    if (filters?.requestorClerkId) query = query.eq('requestor_clerk_id', filters.requestorClerkId)
    const { data, error: err } = await query
    if (err) setError(err.message)
    else setRequisitions((data ?? []) as Requisition[])
    setLoading(false)
  }, [filters?.status, filters?.branchId, filters?.requestorClerkId])

  useEffect(() => { fetchRequisitions() }, [fetchRequisitions])

  return { requisitions, loading, error, refetch: fetchRequisitions }
}
