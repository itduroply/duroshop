export const revalidate = 30

import { ClipboardList } from 'lucide-react'
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
import { StatusBadge } from '@/components/shared/StatusBadge'
import { AgingIndicator } from '@/components/shared/AgingIndicator'
import { AddRequisitionModal } from '@/components/requisitions/AddRequisitionModal'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import type { Requisition, Branch } from '@/types'

export default async function SuperAdminRequisitionsPage() {
  const supabase = await createServiceClient()
  const [{ data }, { data: branchesData }] = await Promise.all([
    supabase
      .from('requisitions')
      .select('*, branch:branches(name), lines:requisition_lines(id)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('branches')
      .select('id, name')
      .eq('active', true)
      .order('name'),
  ])

  const requisitions = (data ?? []) as Requisition[]
  const branches = (branchesData ?? []) as Branch[]

  return (
    <div>
      <PageHeader
        title="All Requisitions"
        description="System-wide requisition history"
        action={<AddRequisitionModal branches={branches} />}
      />
      {requisitions.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <ClipboardList className="mb-4 h-16 w-16 text-[#E2E8F0]" />
          <p className="text-lg font-medium text-[#1A1A2E]">No requisitions yet</p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Aging</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requisitions.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-sm">
                    #{req.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {(req.branch as { name?: string })?.name ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{req.recipient_type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-[#64748B]">
                    {req.lines?.length ?? 0} items
                  </TableCell>
                  <TableCell className="text-sm text-[#64748B]">
                    {formatDate(req.created_at)}
                  </TableCell>
                  <TableCell>
                    <AgingIndicator createdAt={req.created_at} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={req.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
