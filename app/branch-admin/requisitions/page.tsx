'use client'
import { useState, useEffect } from 'react'
import { useSession } from '@/lib/hooks/useSession'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { AgingIndicator } from '@/components/shared/AgingIndicator'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import type { Requisition } from '@/types'

const STATUS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Pending Manager', value: 'manager_pending' },
  { label: 'Pending HR', value: 'hr_pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Dispatched', value: 'dispatched' },
  { label: 'Closed', value: 'closed' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Voided', value: 'voided' },
]

export default function BranchAdminRequisitionsPage() {
  const { session } = useSession()
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    async function load() {
      if (!session?.branchId) return
      const supabase = createClient()
      let query = supabase
        .from('requisitions')
        .select('*, branch:branches(name), lines:requisition_lines(id, item:pop_items(name))')
        .eq('branch_id', session.branchId)
        .order('created_at', { ascending: false })
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      const { data } = await query
      setRequisitions((data ?? []) as Requisition[])
      setLoading(false)
    }
    load()
  }, [session?.branchId, statusFilter])

  return (
    <div>
      <PageHeader
        title="Branch Requisitions"
        description="All requisitions submitted from your branch"
      />
      <div className="mb-4">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setLoading(true) }}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C0392B] border-t-transparent" />
        </div>
      ) : requisitions.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <ClipboardList className="mb-4 h-16 w-16 text-[#E2E8F0]" />
          <p className="text-lg font-medium text-[#1A1A2E]">No requisitions found</p>
          <p className="text-sm text-[#64748B]">Try changing the status filter</p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
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
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{req.recipient_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {req.lines?.slice(0, 2).map((l) => (
                        <Badge key={l.id} variant="outline" className="text-xs">
                          {(l.item as { name?: string })?.name}
                        </Badge>
                      ))}
                      {(req.lines?.length ?? 0) > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{(req.lines?.length ?? 0) - 2}
                        </Badge>
                      )}
                    </div>
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
