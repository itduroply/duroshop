'use client'
import { useState, useEffect } from 'react'
import { useSession } from '@/lib/hooks/useSession'
import { CheckSquare } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { AgingIndicator } from '@/components/shared/AgingIndicator'
import { ApprovalModal } from '@/components/requisitions/ApprovalModal'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import type { Requisition } from '@/types'

export default function HrApprovalsPage() {
  const { session } = useSession()
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Requisition | null>(null)

  useEffect(() => {
    async function load() {
      if (!session) return
      const supabase = createClient()
      const { data } = await supabase
        .from('requisitions')
        .select('*, branch:branches(*), lines:requisition_lines(*, item:pop_items(*)), approval_steps(*)')
        .eq('status', 'hr_pending')
        .order('created_at', { ascending: true })
      setRequisitions((data ?? []) as Requisition[])
      setLoading(false)
    }
    load()
  }, [session])

  return (
    <div>
      <PageHeader
        title="HR Approval Queue"
        description="Second-stage approval for employee POP requisitions"
      />
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C0392B] border-t-transparent" />
        </div>
      ) : requisitions.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <CheckSquare className="mb-3 h-16 w-16 text-[#DCFCE7]" />
          <p className="text-lg font-medium text-[#1A1A2E]">Queue is empty</p>
          <p className="text-sm text-[#64748B]">No requisitions pending HR approval</p>
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
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requisitions.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-sm">
                    #{req.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {req.recipient_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {req.lines?.slice(0, 2).map((l) => (
                        <Badge key={l.id} variant="outline" className="text-xs">
                          {l.item?.name} ×{l.requested_qty}
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
                    <Button size="sm" onClick={() => setSelected(req)}>
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <ApprovalModal
        requisition={selected}
        approverRole="hr"
        open={!!selected}
        onClose={() => setSelected(null)}
        onSuccess={() => {
          setRequisitions((prev) => prev.filter((r) => r.id !== selected?.id))
          setSelected(null)
        }}
      />
    </div>
  )
}
