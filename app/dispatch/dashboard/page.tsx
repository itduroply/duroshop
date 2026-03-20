'use client'
import { useState, useEffect } from 'react'
import { useSession } from '@/lib/hooks/useSession'
import { Truck, PackageCheck, Clock } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { AgingIndicator } from '@/components/shared/AgingIndicator'
import { HandoverForm } from '@/components/distribution/HandoverForm'
import { createClient } from '@/lib/supabase/client'
import { formatDate, getAgingDays } from '@/lib/utils'
import type { Requisition } from '@/types'

export default function DispatchDashboardPage() {
  const { session } = useSession()
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Requisition | null>(null)

  async function load() {
    if (!session) return
    const supabase = createClient()
    let query = supabase
      .from('requisitions')
      .select('*, branch:branches(*), lines:requisition_lines(*, item:pop_items(*))')
      .eq('status', 'approved')
      .order('created_at', { ascending: true })
    if (session.branchId) query = query.eq('branch_id', session.branchId)
    const { data } = await query
    setRequisitions((data ?? []) as Requisition[])
    setLoading(false)
  }

  useEffect(() => {
    if (session) load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const urgent = requisitions.filter((r) => getAgingDays(r.created_at) > 2)

  return (
    <div>
      <PageHeader
        title="Dispatch Dashboard"
        description="Fulfil approved POP requisitions"
      />
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B]">Ready to Dispatch</p>
                <p className="text-2xl font-bold text-[#27AE60]">{requisitions.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DCFCE7]">
                <PackageCheck className="h-5 w-5 text-[#27AE60]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B]">Urgent (&gt;2 days)</p>
                <p className="text-2xl font-bold text-[#E74C3C]">{urgent.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEE2E2]">
                <Clock className="h-5 w-5 text-[#E74C3C]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B]">On-time Rate</p>
                <p className="text-2xl font-bold text-[#1A1A2E]">
                  {requisitions.length > 0
                    ? Math.round(((requisitions.length - urgent.length) / requisitions.length) * 100)
                    : 100}%
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF6FF]">
                <Truck className="h-5 w-5 text-[#3B82F6]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Dispatch Queue</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/dispatch/queue">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C0392B] border-t-transparent" />
            </div>
          ) : requisitions.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <PackageCheck className="mb-3 h-12 w-12 text-[#DCFCE7]" />
              <p className="font-medium text-[#27AE60]">All dispatched!</p>
              <p className="text-sm text-[#64748B]">No approved requisitions pending</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requisitions.slice(0, 8).map((req) => (
                <div
                  key={req.id}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                    getAgingDays(req.created_at) > 2
                      ? 'border-[#FCA5A5] bg-[#FFF5F5]'
                      : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">
                      #{req.id.slice(0, 8).toUpperCase()} ·{' '}
                      {req.lines?.length ?? 0} items
                    </p>
                    <p className="text-xs text-[#64748B] capitalize">
                      {req.recipient_type} · {req.branch?.name} · {formatDate(req.created_at)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {req.lines?.slice(0, 2).map((l) => (
                        <Badge key={l.id} variant="outline" className="text-xs">
                          {l.item?.name} ×{l.approved_qty ?? l.requested_qty}
                        </Badge>
                      ))}
                      {(req.lines?.length ?? 0) > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{(req.lines?.length ?? 0) - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <AgingIndicator createdAt={req.created_at} />
                    <StatusBadge status={req.status} />
                    <Button size="sm" onClick={() => setSelected(req)}>
                      Dispatch
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <HandoverForm
        requisition={selected}
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
