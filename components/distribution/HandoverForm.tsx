'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Badge } from '@/components/ui/badge'
import { RecipientDropdown } from './RecipientDropdown'
import { dispatchRequisition } from '@/lib/actions/distribution'
import type { Requisition } from '@/types'

const schema = z.object({
  recipientId: z.string().min(1, 'Please select a recipient'),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface HandoverFormProps {
  requisition: Requisition | null
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function HandoverForm({ requisition, open, onClose, onSuccess }: HandoverFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const recipientId = watch('recipientId')

  const onSubmit = async (data: FormData) => {
    if (!requisition) return
    setLoading(true)
    setError(null)
    const result = await dispatchRequisition({
      requisitionId: requisition.id,
      recipientId: data.recipientId,
      notes: data.notes,
    })
    setLoading(false)
    if (result.success) {
      reset()
      onSuccess?.()
      onClose()
    } else {
      setError(result.error ?? 'Failed to dispatch')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm Handover</DialogTitle>
        </DialogHeader>
        {requisition && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="rounded-lg bg-[#F8FAFC] p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Requisition</span>
                <span className="font-mono font-medium">
                  #{requisition.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Items</span>
                <span className="font-medium">{requisition.lines?.length ?? 0} item types</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Recipient type</span>
                <Badge variant="outline" className="capitalize">
                  {requisition.recipient_type}
                </Badge>
              </div>
              <div>
                <p className="text-[#64748B] mb-1">Items to dispatch:</p>
                <div className="flex flex-wrap gap-1">
                  {requisition.lines?.map((l) => (
                    <Badge key={l.id} variant="outline" className="text-xs">
                      {l.item?.name} ×{l.approved_qty ?? l.requested_qty}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <RecipientDropdown
              recipientType={requisition.recipient_type}
              branchId={requisition.branch_id ?? ''}
              value={recipientId}
              onChange={(id) => setValue('recipientId', id)}
              error={errors.recipientId?.message}
            />

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any delivery notes or instructions..."
                rows={3}
                onChange={(e) => setValue('notes', e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-[#E74C3C]">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Dispatching...' : 'Confirm Dispatch'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
