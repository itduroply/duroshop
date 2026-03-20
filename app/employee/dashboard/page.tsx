import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, ClipboardList, Clock, CheckCircle, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { AgingIndicator } from '@/components/shared/AgingIndicator'
import { getMyRequisitions } from '@/lib/actions/requisitions'
import { formatDate } from '@/lib/utils'

export default async function EmployeeDashboardPage() {
  const result = await getMyRequisitions()
  const requisitions = result.data ?? []

  const pending = requisitions.filter((r) =>
    ['manager_pending', 'hr_pending', 'submitted'].includes(r.status)
  )
  const approved = requisitions.filter((r) => r.status === 'approved')
  const closed = requisitions.filter((r) => r.status === 'closed')

  const kpis = [
    {
      label: 'Total Requests',
      value: requisitions.length,
      icon: <ClipboardList className="h-5 w-5 text-[#64748B]" />,
      color: 'text-[#1A1A2E]',
    },
    {
      label: 'Pending',
      value: pending.length,
      icon: <Clock className="h-5 w-5 text-[#E67E22]" />,
      color: 'text-[#E67E22]',
    },
    {
      label: 'Approved',
      value: approved.length,
      icon: <CheckCircle className="h-5 w-5 text-[#27AE60]" />,
      color: 'text-[#27AE60]',
    },
    {
      label: 'Completed',
      value: closed.length,
      icon: <Package className="h-5 w-5 text-[#7C3AED]" />,
      color: 'text-[#7C3AED]',
    },
  ]

  const recent = requisitions.slice(0, 5)

  return (
    <div>
      <PageHeader
        title="My Dashboard"
        description="Track your POP requisition requests"
        action={
          <Button asChild>
            <Link href="/employee/raise-requisition">
              <Plus className="mr-2 h-4 w-4" /> New Request
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">{kpi.label}</p>
                  <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8FAFC]">
                  {kpi.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Requests</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/employee/my-requests">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <ClipboardList className="mb-3 h-12 w-12 text-[#E2E8F0]" />
              <p className="text-[#64748B]">No requests yet</p>
              <Button asChild className="mt-4">
                <Link href="/employee/raise-requisition">
                  <Plus className="mr-2 h-4 w-4" /> Raise Your First Request
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between rounded-lg border border-[#E2E8F0] p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1A1A2E]">
                      #{req.id.slice(0, 8).toUpperCase()} ·{' '}
                      {req.lines?.length ?? 0} item{(req.lines?.length ?? 0) !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-[#64748B] capitalize">
                      {req.recipient_type} · {formatDate(req.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AgingIndicator createdAt={req.created_at} />
                    <StatusBadge status={req.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
