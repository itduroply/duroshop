'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Inventory } from '@/types'

export function useInventory(branchId: string) {
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('inventory')
      .select('*, item:pop_items(*, category:categories(*))')
      .eq('branch_id', branchId)
      .order('updated_at', { ascending: false })
    if (err) setError(err.message)
    else setInventory((data ?? []) as Inventory[])
    setLoading(false)
  }, [branchId])

  useEffect(() => { fetchInventory() }, [fetchInventory])

  const lowStockItems = inventory.filter((inv) => inv.available_qty <= inv.low_stock_threshold)

  return { inventory, lowStockItems, loading, error, refetch: fetchInventory }
}
