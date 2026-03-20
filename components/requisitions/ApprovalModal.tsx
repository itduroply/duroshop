'use client'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { approveRequisition, rejectRequisition } from '@/lib/actions/approvals'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Requisition, ApproverRole } from '@/types'

interface ApprovalModalProps {
  requisition: Requisition | null
  approverRole: ApproverRole
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ApprovalModal({
  requisition,
  approverRole,
  open,
  onClose,
  onSuccess,
}: ApprovalModalProps) {
  const [remarks, setRemarks] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approvedQtys, setApprovedQtys] = useState<Record<string, number>>({})

  const lines = requisition?.lines ?? []

  const getApprovedQty = (lineId: string, requestedQty: number) =>
    approvedQtys[lineId] ?? requestedQty

  const handleApprove = async () => {
    if (!requisition) return
    setLoading(true)
    setError(null)
    const result = await approveRequisition({
      requisitionId: requisition.id,
      approverRole,
      approvedLines: lines.map((l) => ({
        lineId: l.id,
        approvedQty: getApprovedQty(l.id, l.requested_qty),
      })),
      remarks: remarks || undefined,
    })
    setLoading(false)
    if (result.success) {
      setRemarks('')
      setApprovedQtys({})
      onSuccess?.()
      onClose()
    } else {
      setError(result.error ?? 'Failed to approve')
    }
  }

  const handleReject = async () => {
    if (!requisition) return
    if (!remarks.trim()) {
      setError('Please provide a reason for rejection')
      return
    }
    setLoading(true)
    setError(null)
    const result = await rejectRequisition({
      requisitionId: requisition.id,
      approverRole,
      remarks,
    })
    setLoading(false)
    if (result.success) {
      setRemarks('')
      onSuccess?.()
      onClose()
    } else {
      setError(result.error ?? 'Failed to reject')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Requisition</DialogTitle>
        </DialogHeader>
        {requisition && (
          <div className="space-y-4">
            <div className="rounded-lg bg-[#F8FAFC] p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-[#64748B]">Status</span>
                <StatusBadge status={requisition.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Recipient Type</span>
                <Badge variant="outline" className="capitalize">{requisition.recipient_type}</Badge>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-[#64748B] shrink-0">Reason</span>
                <span className="text-right text-[#1A1A2E]">{requisition.reason}</span>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-[#1A1A2E]">Line Items</h4>
              <div className="space-y-2">
                {lines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between rounded-lg border border-[#E2E8F0] p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{line.item?.name}</p>
                      <p className="text-xs text-[#64748B]">
                        Requested: {line.requested_qty} {line.item?.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-[#64748B] whitespace-nowrap">
                        Approve qty:
                      </Label>
                      <Input
                        type="number"
                        className="w-20 h-8 text-sm"
                        min={0}
                        max={line.requested_qty}
                        value={getApprovedQty(line.id, line.requested_qty)}
                        onChange={(e) =>
                          setApprovedQtys((prev) => ({
                            ...prev,
                            [line.id]: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Remarks{' '}
                <span className="text-[#94A3B8] font-normal">
                  (required for rejection)
                </span>
              </Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add remarks..."
                rows={3}
              />
            </div>

            {error && <p className="text-sm text-[#E74C3C]">{error}</p>}
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReject} disabled={loading}>
            Reject
          </Button>
          <Button onClick={handleApprove} disabled={loading}>
            {loading ? 'Processing...' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
