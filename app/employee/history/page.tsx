export const revalidate = 30

import { History } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getMyRequisitions } from '@/lib/actions/requisitions'
import { formatDateTime } from '@/lib/utils'

export default async function EmployeeHistoryPage() {
  const result = await getMyRequisitions()
  const history = (result.data ?? []).filter((r) =>
    ['closed', 'dispatched', 'rejected', 'voided'].includes(r.status)
  )

  return (
    <div>
      <PageHeader
        title="Request History"
        description="Completed, rejected, and voided requisitions"
      />
      {history.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <History className="mb-4 h-16 w-16 text-[#E2E8F0]" />
          <p className="text-lg font-medium text-[#1A1A2E]">No history yet</p>
          <p className="text-sm text-[#64748B]">
            Completed or rejected requests will appear here
          </p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Recipient Type</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-sm">
                    #{req.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell className="capitalize">{req.recipient_type}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {req.lines?.slice(0, 2).map((l) => (
                        <Badge key={l.id} variant="outline" className="text-xs">
                          {l.item?.name}
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
                    {formatDateTime(req.created_at)}
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
