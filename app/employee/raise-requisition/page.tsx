'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/hooks/useSession'
import { Users, HardHat, Store, ChevronRight, ChevronLeft, ShoppingCart, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { ItemGrid } from '@/components/requisitions/ItemGrid'
import { createClient } from '@/lib/supabase/client'
import { createRequisition } from '@/lib/actions/requisitions'
import { cn } from '@/lib/utils'
import type { CartItem, PopItem, Category, RecipientType } from '@/types'

type Step = 1 | 2 | 3

interface ItemWithInventory extends PopItem {
  available_qty: number
  low_stock_threshold: number
}

const recipientCards = [
  {
    type: 'employee' as RecipientType,
    label: 'Employee',
    description: 'Internal staff POP request',
    icon: <Users className="h-8 w-8" />,
  },
  {
    type: 'architect' as RecipientType,
    label: 'Architect',
    description: 'External architect project materials',
    icon: <HardHat className="h-8 w-8" />,
  },
  {
    type: 'dealer' as RecipientType,
    label: 'Dealer',
    description: 'Dealer or distributor request',
    icon: <Store className="h-8 w-8" />,
  },
]

export default function RaiseRequisitionPage() {
  const { session } = useSession()
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [recipientType, setRecipientType] = useState<RecipientType | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [reason, setReason] = useState('')
  const [items, setItems] = useState<ItemWithInventory[]>([])
  const [branchId, setBranchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      if (!session) return
      setLoading(true)
      const bid = session.branchId ?? null
      setBranchId(bid)
      if (bid) {
        const supabase = createClient()
        const { data: invData } = await supabase
          .from('inventory')
          .select('*, item:pop_items(*, category:categories(*))')
          .eq('branch_id', bid)
          .gt('available_qty', 0)
        if (invData) {
          setItems(
            invData
              .filter((inv) => inv.item)
              .map((inv) => ({
                ...(inv.item as PopItem & { category?: Category }),
                available_qty: inv.available_qty as number,
                low_stock_threshold: inv.low_stock_threshold as number,
              }))
          )
        }
      }
      setLoading(false)
    }
    loadData()
  }, [session])

  const handleQuantityChange = (item: ItemWithInventory, qty: number) => {
    if (qty === 0) {
      setCart((prev) => prev.filter((c) => c.item.id !== item.id))
    } else {
      setCart((prev) => {
        const existing = prev.find((c) => c.item.id === item.id)
        if (existing) {
          return prev.map((c) => (c.item.id === item.id ? { ...c, quantity: qty } : c))
        }
        return [...prev, { item, quantity: qty }]
      })
    }
  }

  const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0)
  const canSubmit = recipientType && cart.length > 0 && reason.length >= 10

  const handleSubmit = async () => {
    if (!canSubmit || !session || !branchId) return
    setSubmitting(true)
    setError(null)
    const result = await createRequisition({
      branchId,
      recipientType: recipientType!,
      reason,
      items: cart,
    })
    setSubmitting(false)
    if (result.success) {
      router.push('/employee/my-requests')
    } else {
      setError(result.error ?? 'Failed to submit')
    }
  }

  return (
    <div className="pb-24">
      <PageHeader title="Raise Requisition" description="Request POP items for distribution" />

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                step === s
                  ? 'bg-[#C0392B] text-white'
                  : step > s
                  ? 'bg-[#DCFCE7] text-[#16A34A]'
                  : 'bg-[#F8FAFC] text-[#94A3B8]'
              )}
            >
              {step > s ? '✓' : s}
            </div>
            <span
              className={cn(
                'text-xs font-medium hidden sm:inline',
                step === s ? 'text-[#1A1A2E]' : 'text-[#94A3B8]'
              )}
            >
              {s === 1 ? 'Recipient' : s === 2 ? 'Items' : 'Review'}
            </span>
            {s < 3 && <ChevronRight className="h-4 w-4 text-[#E2E8F0]" />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-[#64748B]">Who is this POP request for?</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {recipientCards.map((card) => (
              <button
                key={card.type}
                onClick={() => setRecipientType(card.type)}
                className={cn(
                  'flex flex-col items-center rounded-xl border-2 p-6 text-center transition-all',
                  recipientType === card.type
                    ? 'border-[#C0392B] bg-[#FEF2F2]'
                    : 'border-[#E2E8F0] bg-white hover:border-[#C0392B]/40'
                )}
              >
                <div
                  className={cn(
                    'mb-3 flex h-14 w-14 items-center justify-center rounded-full',
                    recipientType === card.type
                      ? 'bg-[#C0392B] text-white'
                      : 'bg-[#F8FAFC] text-[#64748B]'
                  )}
                >
                  {card.icon}
                </div>
                <p className="font-semibold text-[#1A1A2E]">{card.label}</p>
                <p className="mt-1 text-xs text-[#64748B]">{card.description}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setStep(2)} disabled={!recipientType}>
              Next: Select Items <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#C0392B]" />
            </div>
          ) : (
            <ItemGrid items={items} cart={cart} onQuantityChange={handleQuantityChange} />
          )}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={cart.length === 0}>
              Next: Review ({cart.length} type{cart.length !== 1 ? 's' : ''})
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-3 font-semibold text-[#1A1A2E]">Order Summary</h3>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm text-[#64748B]">Recipient type:</span>
                <span className="rounded-full bg-[#FEF2F2] px-2.5 py-0.5 text-xs font-medium text-[#C0392B] capitalize">
                  {recipientType}
                </span>
              </div>
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.item.id} className="flex justify-between text-sm">
                    <span className="text-[#1A1A2E]">{item.item.name}</span>
                    <span className="font-medium text-[#64748B]">
                      {item.quantity} {item.item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <div className="space-y-1.5">
            <Label htmlFor="reason">
              Reason for Request <span className="text-[#E74C3C]">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why you need these POP items (minimum 10 characters)..."
              rows={4}
              className={reason.length > 0 && reason.length < 10 ? 'border-[#E74C3C]' : ''}
            />
            {reason.length > 0 && reason.length < 10 && (
              <p className="text-xs text-[#E74C3C]">Reason must be at least 10 characters</p>
            )}
            <p className="text-xs text-[#94A3B8]">{reason.length} characters</p>
          </div>
          {error && <p className="text-sm text-[#E74C3C]">{error}</p>}
          <div className="pt-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        </div>
      )}

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#E2E8F0] bg-white p-4 lg:left-64">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-[#64748B]" />
            <span className="text-sm font-medium text-[#1A1A2E]">
              {cart.length} item type{cart.length !== 1 ? 's' : ''} · {totalItems} unit{totalItems !== 1 ? 's' : ''}
            </span>
          </div>
          {step === 3 && (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                'Submit Requisition'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
