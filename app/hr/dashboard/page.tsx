import { redirect } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 30
import { Clock, XCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { AgingIndicator } from '@/components/shared/AgingIndicator'
import { getPendingApprovals } from '@/lib/actions/approvals'
import { formatDate, getAgingDays } from '@/lib/utils'

export default async function HrDashboardPage() {
  const result = await getPendingApprovals('hr')
  const pending = result.data ?? []
  const urgent = pending.filter((r) => getAgingDays(r.created_at) > 2)

  return (
    <div>
      <PageHeader
        title="HR Dashboard"
        description="Second-stage approval for employee POP requisitions"
      />
      <div className="mb-6 grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B]">Awaiting HR Approval</p>
                <p className="text-2xl font-bold text-[#E67E22]">{pending.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEF3C7]">
                <Clock className="h-5 w-5 text-[#E67E22]" />
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
                <XCircle className="h-5 w-5 text-[#E74C3C]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Pending Approvals</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/hr/approvals">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle className="mb-3 h-12 w-12 text-[#DCFCE7]" />
              <p className="font-medium text-[#27AE60]">All caught up!</p>
              <p className="text-sm text-[#64748B]">No pending HR approvals</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.slice(0, 5).map((req) => (
                <Link
                  key={req.id}
                  href={`/hr/approvals/${req.id}`}
                  className="flex items-center justify-between rounded-lg border border-[#E2E8F0] p-3 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">
                      #{req.id.slice(0, 8).toUpperCase()} ·{' '}
                      {req.lines?.length ?? 0} items
                    </p>
                    <p className="text-xs text-[#64748B] capitalize">
                      {req.recipient_type} · {formatDate(req.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AgingIndicator createdAt={req.created_at} />
                    <StatusBadge status={req.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
