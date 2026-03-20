export const revalidate = 30

import { FileText } from 'lucide-react'
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
import { formatDateTime } from '@/lib/utils'
import type { InventoryAudit } from '@/types'

const ACTION_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  receive: 'success',
  dispatch: 'info',
  adjust: 'warning',
  void: 'danger',
}

export default async function SuperAdminAuditLogsPage() {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('inventory_audit')
    .select(`
      *,
      item:pop_items(name, sku, unit),
      branch:branches(name)
    `)
    .order('created_at', { ascending: false })
    .limit(200)
  const logs = (data ?? []) as InventoryAudit[]

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Inventory movement history across all branches"
      />
      {logs.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <FileText className="mb-4 h-16 w-16 text-[#E2E8F0]" />
          <p className="text-lg font-medium text-[#1A1A2E]">No audit logs yet</p>
          <p className="text-sm text-[#64748B]">Inventory changes will be recorded here</p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Before</TableHead>
                <TableHead>After</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const item = log.item as { name?: string; sku?: string; unit?: string }
                const branch = log.branch as { name?: string }
                const delta = log.quantity_after - log.quantity_before
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-[#64748B] whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{item?.name}</p>
                      <p className="text-xs text-[#64748B]">{item?.sku}</p>
                    </TableCell>
                    <TableCell className="text-sm">{branch?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={ACTION_COLORS[log.action] ?? 'default'} className="capitalize">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={delta >= 0 ? 'text-[#27AE60] font-semibold' : 'text-[#E74C3C] font-semibold'}>
                        {delta >= 0 ? '+' : ''}{delta} {item?.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-[#64748B]">
                      {log.quantity_before} {item?.unit}
                    </TableCell>
                    <TableCell className="text-sm text-[#64748B]">
                      {log.quantity_after} {item?.unit}
                    </TableCell>
                    <TableCell className="text-sm text-[#64748B] max-w-[200px] truncate">
                      {log.notes ?? '—'}
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
