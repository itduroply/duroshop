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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { adjustStock } from '@/lib/actions/inventory'
import type { Inventory } from '@/types'

const schema = z.object({
  newQty: z.coerce.number().int().min(0, 'Quantity cannot be negative'),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
})
type FormData = z.infer<typeof schema>

interface StockAdjustModalProps {
  inventory: Inventory | null
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function StockAdjustModal({ inventory, open, onClose, onSuccess }: StockAdjustModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: { newQty: inventory?.available_qty ?? 0, reason: '' },
  })

  const onSubmit = async (data: FormData) => {
    if (!inventory) return
    setLoading(true)
    setError(null)
    const result = await adjustStock(
      inventory.branch_id,
      inventory.item_id,
      data.newQty,
      data.reason
    )
    setLoading(false)
    if (result.success) {
      reset()
      onSuccess?.()
      onClose()
    } else {
      setError(result.error ?? 'Failed to adjust stock')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock — {inventory?.item?.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-lg bg-[#F8FAFC] p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Current quantity</span>
              <span className="font-semibold">
                {inventory?.available_qty} {inventory?.item?.unit}
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newQty">New Quantity</Label>
            <Input id="newQty" type="number" min={0} {...register('newQty')} />
            {errors.newQty && (
              <p className="text-xs text-[#E74C3C]">{errors.newQty.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason for Adjustment</Label>
            <Textarea
              id="reason"
              rows={3}
              placeholder="e.g., Physical count correction"
              {...register('reason')}
            />
            {errors.reason && (
              <p className="text-xs text-[#E74C3C]">{errors.reason.message}</p>
            )}
          </div>
          {error && <p className="text-sm text-[#E74C3C]">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Adjustment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
