export const revalidate = 30

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { AgingIndicator } from '@/components/shared/AgingIndicator'
import { RequisitionTimeline } from '@/components/requisitions/RequisitionTimeline'
import { getMyRequisitions } from '@/lib/actions/requisitions'
import { formatDate } from '@/lib/utils'

export default async function MyRequestsPage() {
  const result = await getMyRequisitions()
  const requisitions = result.data ?? []

  const groups = {
    active: requisitions.filter((r) =>
      ['manager_pending', 'hr_pending', 'submitted', 'approved'].includes(r.status)
    ),
    completed: requisitions.filter((r) => ['closed', 'dispatched'].includes(r.status)),
    rejected: requisitions.filter((r) => ['rejected', 'voided'].includes(r.status)),
  }

  const ReqList = ({ data }: { data: typeof requisitions }) =>
    data.length === 0 ? (
      <div className="flex flex-col items-center py-12 text-center">
        <ClipboardList className="mb-3 h-10 w-10 text-[#E2E8F0]" />
        <p className="text-sm text-[#64748B]">No requests in this category</p>
      </div>
    ) : (
      <div className="space-y-4 p-1">
        {data.map((req) => (
          <Card key={req.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-mono text-[#64748B]">
                    #{req.id.slice(0, 8).toUpperCase()}
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-[#64748B]">
                    {formatDate(req.created_at)} ·{' '}
                    <span className="capitalize">{req.recipient_type}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AgingIndicator createdAt={req.created_at} />
                  <StatusBadge status={req.status} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4 pt-0">
              <div className="mb-3 rounded-lg bg-[#F8FAFC] p-3 text-sm text-[#64748B]">
                <span className="font-medium text-[#1A1A2E]">Reason: </span>
                {req.reason}
              </div>
              <div className="mb-4">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
                  Items
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {req.lines?.map((line) => (
                    <Badge key={line.id} variant="outline" className="text-xs">
                      {line.item?.name} ×{line.approved_qty ?? line.requested_qty}
                    </Badge>
                  ))}
                </div>
              </div>
              <RequisitionTimeline requisition={req} />
            </CardContent>
          </Card>
        ))}
      </div>
    )

  return (
    <div>
      <PageHeader
        title="My Requests"
        description="Track all your POP requisition requests"
        action={
          <Button asChild>
            <Link href="/employee/raise-requisition">
              <Plus className="mr-2 h-4 w-4" /> New Request
            </Link>
          </Button>
        }
      />

      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active">Active ({groups.active.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({groups.completed.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({groups.rejected.length})</TabsTrigger>
          <TabsTrigger value="all">All ({requisitions.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active"><ReqList data={groups.active} /></TabsContent>
        <TabsContent value="completed"><ReqList data={groups.completed} /></TabsContent>
        <TabsContent value="rejected"><ReqList data={groups.rejected} /></TabsContent>
        <TabsContent value="all"><ReqList data={requisitions} /></TabsContent>
      </Tabs>
    </div>
  )
}
