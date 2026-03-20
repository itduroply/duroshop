'use client'
import { useState, useEffect } from 'react'
import { useSession } from '@/lib/hooks/useSession'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { receiveStock } from '@/lib/actions/inventory'
import { createClient } from '@/lib/supabase/client'
import type { PopItem } from '@/types'

const schema = z.object({
  item_id: z.string().min(1, 'Select an item'),
  quantity: z.coerce.number().int().positive('Must be a positive number'),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function ReceiveStockPage() {
  const { session } = useSession()
  const router = useRouter()
  const [items, setItems] = useState<PopItem[]>([])
  const [branchId, setBranchId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    async function load() {
      if (!session) return
      setBranchId(session.branchId ?? null)
      const supabase = createClient()
      const { data } = await supabase
        .from('pop_items')
        .select('*')
        .eq('is_active', true)
        .order('name')
      setItems((data ?? []) as PopItem[])
    }
    load()
  }, [session])

  async function onSubmit(values: FormValues) {
    if (!branchId) return
    setSubmitting(true)
    setError('')
    const result = await receiveStock({
      branch_id: branchId,
      item_id: values.item_id,
      quantity: values.quantity,
      notes: values.notes,
    })
    if (result.success) {
      router.push('/branch-admin/inventory')
    } else {
      setError(result.error ?? 'Failed to receive stock')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/branch-admin/inventory">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory
          </Link>
        </Button>
      </div>
      <PageHeader
        title="Receive Stock"
        description="Record incoming inventory for your branch"
      />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Stock Receipt Form</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Item</Label>
              <Select onValueChange={(v) => setValue('item_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an item…" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.item_id && (
                <p className="text-xs text-[#E74C3C]">{errors.item_id.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quantity">Quantity Received</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                placeholder="0"
                {...register('quantity')}
              />
              {errors.quantity && (
                <p className="text-xs text-[#E74C3C]">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="e.g. Invoice #12345"
                {...register('notes')}
              />
            </div>

            {error && <p className="text-sm text-[#E74C3C]">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Saving…' : 'Record Receipt'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/branch-admin/inventory">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
