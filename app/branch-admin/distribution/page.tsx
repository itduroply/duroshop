'use client'
import { useState, useEffect } from 'react'
import { useSession } from '@/lib/hooks/useSession'
import { Truck } from 'lucide-react'
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
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils'
import type { Distribution } from '@/types'

export default function BranchAdminDistributionPage() {
  const { session } = useSession()
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!session?.branchId) return
      const supabase = createClient()
      const { data } = await supabase
        .from('distributions')
        .select(`
          *,
          requisition:requisitions(id, recipient_type, branch_id),
          recipient:recipients(name, type)
        `)
        .eq('requisition.branch_id', session.branchId)
        .order('dispatched_at', { ascending: false })
      setDistributions((data ?? []) as Distribution[])
      setLoading(false)
    }
    load()
  }, [session?.branchId])

  return (
    <div>
      <PageHeader
        title="Distribution Log"
        description="All dispatched items from your branch"
      />
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C0392B] border-t-transparent" />
        </div>
      ) : distributions.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Truck className="mb-4 h-16 w-16 text-[#E2E8F0]" />
          <p className="text-lg font-medium text-[#1A1A2E]">No distributions yet</p>
          <p className="text-sm text-[#64748B]">Dispatched items will appear here</p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requisition</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dispatched By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distributions.map((dist) => (
                <TableRow key={dist.id}>
                  <TableCell className="font-mono text-sm">
                    #{(dist.requisition_id ?? '').slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell className="font-medium">
                    {(dist.recipient as { name?: string })?.name ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {(dist.recipient as { type?: string })?.type ?? '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-[#64748B]">
                    {dist.dispatched_by_clerk_id?.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-sm text-[#64748B]">
                    {formatDateTime(dist.dispatched_at)}
                  </TableCell>
                  <TableCell className="text-sm text-[#64748B]">
                    {dist.notes ?? '—'}
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
