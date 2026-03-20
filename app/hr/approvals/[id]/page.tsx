import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { RequisitionTimeline } from '@/components/requisitions/RequisitionTimeline'
import { AgingIndicator } from '@/components/shared/AgingIndicator'
import { getRequisitionById } from '@/lib/actions/requisitions'
import { formatDateTime } from '@/lib/utils'

export default async function HrApprovalDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getSession()
  if (!session) redirect('/sign-in')
  const result = await getRequisitionById(params.id)
  if (!result.success || !result.data) notFound()
  const req = result.data

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/hr/approvals">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Queue
          </Link>
        </Button>
      </div>
      <PageHeader
        title={`Requisition #${req.id.slice(0, 8).toUpperCase()}`}
        description={`Submitted ${formatDateTime(req.created_at)}`}
        action={<StatusBadge status={req.status} />}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Recipient Type</span>
                <Badge variant="outline" className="capitalize">
                  {req.recipient_type}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Branch</span>
                <span>{req.branch?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-[#64748B] shrink-0">Reason</span>
                <span className="text-right">{req.reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Aging</span>
                <AgingIndicator createdAt={req.created_at} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {req.lines?.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between rounded-lg border border-[#E2E8F0] p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{line.item?.name}</p>
                      <p className="text-xs text-[#64748B]">
                        {line.item?.sku} · {line.item?.category?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        <span className="font-semibold">{line.approved_qty ?? line.requested_qty}</span>{' '}
                        <span className="text-[#64748B]">{line.item?.unit}</span>
                      </p>
                      {line.approved_qty !== null && line.approved_qty !== line.requested_qty && (
                        <p className="text-xs text-[#E67E22]">
                          Requested: {line.requested_qty}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approval Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <RequisitionTimeline requisition={req} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
