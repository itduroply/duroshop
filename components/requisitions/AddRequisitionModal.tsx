'use client'
import { useState, useEffect } from 'react'
import { Plus, ChevronRight, ChevronLeft, Loader2, Users, HardHat, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createRequisition } from '@/lib/actions/requisitions'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Branch, CartItem, PopItem, Category, RecipientType } from '@/types'

interface ItemWithInventory extends PopItem {
  available_qty: number
  low_stock_threshold: number
}

const RECIPIENT_CARDS = [
  { type: 'employee' as RecipientType, label: 'Employee', icon: <Users className="h-6 w-6" /> },
  { type: 'architect' as RecipientType, label: 'Architect', icon: <HardHat className="h-6 w-6" /> },
  { type: 'dealer' as RecipientType, label: 'Dealer', icon: <Store className="h-6 w-6" /> },
]

export function AddRequisitionModal({ branches }: { branches: Branch[] }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [branchId, setBranchId] = useState('')
  const [recipientType, setRecipientType] = useState<RecipientType | null>(null)
  const [items, setItems] = useState<ItemWithInventory[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [reason, setReason] = useState('')
  const [loadingItems, setLoadingItems] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!branchId) return
    setLoadingItems(true)
    setCart([])
    const supabase = createClient()
    supabase
      .from('inventory')
      .select('*, item:pop_items(*, category:categories(*))')
      .eq('branch_id', branchId)
      .gt('available_qty', 0)
      .then(({ data }) => {
        setItems(
          (data ?? [])
            .filter((inv) => inv.item)
            .map((inv) => ({
              ...(inv.item as PopItem & { category?: Category }),
              available_qty: inv.available_qty as number,
              low_stock_threshold: inv.low_stock_threshold as number,
            }))
        )
        setLoadingItems(false)
      })
  }, [branchId])

  function handleQty(item: ItemWithInventory, qty: number) {
    if (qty === 0) {
      setCart((p) => p.filter((c) => c.item.id !== item.id))
    } else {
      setCart((p) => {
        const exists = p.find((c) => c.item.id === item.id)
        if (exists) return p.map((c) => (c.item.id === item.id ? { ...c, quantity: qty } : c))
        return [...p, { item, quantity: qty }]
      })
    }
  }

  function getQty(id: string) {
    return cart.find((c) => c.item.id === id)?.quantity ?? 0
  }

  async function handleSubmit() {
    if (!branchId || !recipientType || cart.length === 0 || reason.length < 10) return
    setSubmitting(true)
    setError('')
    const result = await createRequisition({ branchId, recipientType, reason, items: cart })
    setSubmitting(false)
    if (!result.success) { setError(result.error ?? 'Failed to submit'); return }
    setOpen(false)
    resetState()
  }

  function resetState() {
    setStep(1); setBranchId(''); setRecipientType(null)
    setItems([]); setCart([]); setReason(''); setError('')
  }

  const canProceedStep1 = branchId && recipientType
  const canSubmit = cart.length > 0 && reason.length >= 10

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState() }}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> Add Requisition</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Requisition</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-1">
          {(['Branch & Recipient', 'Select Items', 'Review'] as const).map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                step === i + 1 ? 'bg-[#C0392B] text-white'
                  : step > i + 1 ? 'bg-[#DCFCE7] text-[#16A34A]'
                  : 'bg-[#F1F5F9] text-[#94A3B8]'
              )}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={cn('text-xs hidden sm:inline', step === i + 1 ? 'text-[#1A1A2E] font-medium' : 'text-[#94A3B8]')}>{label}</span>
              {i < 2 && <ChevronRight className="h-3 w-3 text-[#E2E8F0]" />}
            </div>
          ))}
        </div>

        {/* Step 1: Branch + Recipient */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Recipient Type</Label>
              <div className="grid grid-cols-3 gap-3">
                {RECIPIENT_CARDS.map((card) => (
                  <button
                    key={card.type}
                    type="button"
                    onClick={() => setRecipientType(card.type)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all',
                      recipientType === card.type
                        ? 'border-[#C0392B] bg-[#FEF2F2]'
                        : 'border-[#E2E8F0] hover:border-[#C0392B]/40'
                    )}
                  >
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-full',
                      recipientType === card.type ? 'bg-[#C0392B] text-white' : 'bg-[#F8FAFC] text-[#64748B]'
                    )}>{card.icon}</div>
                    <span className="text-sm font-medium text-[#1A1A2E]">{card.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next: Select Items <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Items */}
        {step === 2 && (
          <div className="space-y-4">
            {loadingItems ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#C0392B]" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#64748B]">
                No items in stock for this branch.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {items.map((item) => {
                  const qty = getQty(item.id)
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-[#E2E8F0] px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-[#1A1A2E]">{item.name}</p>
                        <p className="text-xs text-[#64748B]">{item.sku} · {item.available_qty} {item.unit} available</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQty(item, Math.max(0, qty - 1))}
                          disabled={qty === 0}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E2E8F0] text-sm disabled:opacity-30 hover:bg-[#F8FAFC]"
                        >−</button>
                        <span className="w-6 text-center text-sm font-medium">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleQty(item, Math.min(item.available_qty, qty + 1))}
                          disabled={qty >= item.available_qty}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E2E8F0] text-sm disabled:opacity-30 hover:bg-[#F8FAFC]"
                        >+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={cart.length === 0}>
                Review ({cart.length}) <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review + Submit */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-[#E2E8F0] p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#64748B]">Branch:</span>
                <span className="font-medium">{branches.find((b) => b.id === branchId)?.name}</span>
                <span className="mx-2 text-[#E2E8F0]">·</span>
                <span className="text-[#64748B]">Recipient:</span>
                <span className="capitalize font-medium">{recipientType}</span>
              </div>
              {cart.map((c) => (
                <div key={c.item.id} className="flex justify-between text-sm">
                  <span className="text-[#1A1A2E]">{c.item.name}</span>
                  <span className="text-[#64748B] font-medium">{c.quantity} {c.item.unit}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Reason <span className="text-[#E74C3C]">*</span></Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe why these POP items are needed (min 10 characters)…"
                rows={3}
                className={reason.length > 0 && reason.length < 10 ? 'border-[#E74C3C]' : ''}
              />
              {reason.length > 0 && reason.length < 10 && (
                <p className="text-xs text-[#E74C3C]">At least 10 characters required</p>
              )}
            </div>
            {error && <p className="text-sm text-[#C0392B]">{error}</p>}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : 'Submit Requisition'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
