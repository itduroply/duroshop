export const revalidate = 30

import { Package } from 'lucide-react'
import { Card } from '@/components/ui/card'
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
import { createServiceClient } from '@/lib/supabase/server'

export default async function SuperAdminInventoryPage() {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('inventory')
    .select('*, item:pop_items(name, sku, unit, low_stock_threshold, category:categories(name)), branch:branches(name)')
    .order('quantity_on_hand', { ascending: true })

  const inventory = data ?? []

  return (
    <div>
      <PageHeader
        title="System Inventory"
        description="Stock levels across all branches"
      />
      {inventory.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Package className="mb-4 h-16 w-16 text-[#E2E8F0]" />
          <p className="text-lg font-medium text-[#1A1A2E]">No inventory records</p>
          <p className="text-sm text-[#64748B]">Stock records will appear here once branches receive items</p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>On Hand</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((inv) => {
                const item = inv.item as { name?: string; sku?: string; unit?: string; low_stock_threshold?: number; category?: { name?: string } }
                const branch = inv.branch as { name?: string }
                const isLow = (inv.quantity_on_hand as number) <= (item?.low_stock_threshold ?? 5)
                return (
                  <TableRow key={inv.id as string}>
                    <TableCell className="font-medium">{item?.name}</TableCell>
                    <TableCell className="font-mono text-sm text-[#64748B]">{item?.sku}</TableCell>
                    <TableCell>{item?.category?.name ?? '—'}</TableCell>
                    <TableCell>{branch?.name ?? '—'}</TableCell>
                    <TableCell>
                      <span className={isLow ? 'font-semibold text-[#E74C3C]' : ''}>
                        {inv.quantity_on_hand as number} {item?.unit}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isLow ? (
                        <Badge variant="danger">Low Stock</Badge>
                      ) : (
                        <Badge variant="success">OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
