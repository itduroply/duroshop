'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/lib/hooks/useSession'
import { Package, Search, ArrowDownToLine } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { StockAdjustModal } from '@/components/inventory/StockAdjustModal'
import { createClient } from '@/lib/supabase/client'
import type { Inventory } from '@/types'

export default function BranchAdminInventoryPage() {
  const { session } = useSession()
  const [inventory, setInventory] = useState<Inventory[]>([])
  const [filtered, setFiltered] = useState<Inventory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Inventory | null>(null)

  const load = useCallback(async () => {
    if (!session?.branchId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('inventory')
      .select('*, item:pop_items(*, category:categories(name))')
      .eq('branch_id', session.branchId)
      .order('quantity_on_hand', { ascending: true })
    const inv = (data ?? []) as Inventory[]
    setInventory(inv)
    setFiltered(inv)
    setLoading(false)
  }, [session?.branchId])

  useEffect(() => { if (session) load() }, [load, session])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      inventory.filter(
        (i) =>
          (i.item as { name?: string })?.name?.toLowerCase().includes(q) ||
          (i.item as { sku?: string })?.sku?.toLowerCase().includes(q)
      )
    )
  }, [search, inventory])

  return (
    <div>
      <PageHeader
        title="Branch Inventory"
        description="Stock levels and adjustments for your branch"
        action={
          <Button asChild size="sm">
            <Link href="/branch-admin/inventory/receive">
              <ArrowDownToLine className="mr-2 h-4 w-4" /> Receive Stock
            </Link>
          </Button>
        }
      />
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C0392B] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Package className="mb-4 h-16 w-16 text-[#E2E8F0]" />
          <p className="text-lg font-medium text-[#1A1A2E]">No items found</p>
          <p className="text-sm text-[#64748B]">Try adjusting your search</p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>On Hand</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => {
                const item = inv.item as { name?: string; sku?: string; unit?: string; low_stock_threshold?: number; category?: { name?: string } }
                const isLow = inv.quantity_on_hand <= (item?.low_stock_threshold ?? 5)
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{item?.name}</TableCell>
                    <TableCell className="font-mono text-sm text-[#64748B]">{item?.sku}</TableCell>
                    <TableCell>{item?.category?.name ?? '—'}</TableCell>
                    <TableCell>
                      <span className={isLow ? 'font-semibold text-[#E74C3C]' : ''}>
                        {inv.quantity_on_hand} {item?.unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isLow ? (
                        <Badge variant="danger">Low Stock</Badge>
                      ) : (
                        <Badge variant="success">In Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setSelected(inv)}>
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
      <StockAdjustModal
        inventory={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onSuccess={() => { load(); setSelected(null) }}
      />
    </div>
  )
}
