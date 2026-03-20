'use client'
import Image from 'next/image'
import { Minus, Plus, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CartItem, PopItem, Category } from '@/types'

interface ItemWithInventory extends PopItem {
  available_qty: number
  low_stock_threshold: number
}

interface ItemGridProps {
  items: ItemWithInventory[]
  cart: CartItem[]
  onQuantityChange: (item: ItemWithInventory, qty: number) => void
}

export function ItemGrid({ items, cart, onQuantityChange }: ItemGridProps) {
  const getCartQty = (itemId: string) =>
    cart.find((c) => c.item.id === itemId)?.quantity ?? 0

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F8FAFC]">
          <Package className="h-8 w-8 text-[#E2E8F0]" />
        </div>
        <p className="font-medium text-[#1A1A2E]">No items available</p>
        <p className="text-sm text-[#64748B]">No inventory items found for your branch</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const qty = getCartQty(item.id)
        const isLimited = item.available_qty <= item.low_stock_threshold
        const isSelected = qty > 0
        return (
          <div
            key={item.id}
            className={cn(
              'relative flex flex-col rounded-xl border-2 bg-white transition-all',
              isSelected
                ? 'border-[#C0392B] shadow-md'
                : 'border-[#E2E8F0] hover:border-[#C0392B]/40'
            )}
          >
            {isLimited && (
              <Badge
                variant="warning"
                className="absolute right-2 top-2 z-10 text-[10px] px-1.5 py-0"
              >
                Limited
              </Badge>
            )}
            <div className="relative h-28 overflow-hidden rounded-t-xl bg-[#F8FAFC]">
              {item.image_url ? (
                <Image src={item.image_url} alt={item.name} fill className="object-contain p-2" />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl font-bold text-[#E2E8F0]">
                  {item.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col p-3">
              <p className="text-sm font-medium text-[#1A1A2E] line-clamp-2 leading-tight">
                {item.name}
              </p>
              {item.category && (
                <p className="text-xs text-[#64748B] mt-0.5">{item.category.name}</p>
              )}
              <p
                className={`mt-1 text-xs font-medium ${
                  isLimited ? 'text-[#E67E22]' : 'text-[#27AE60]'
                }`}
              >
                {item.available_qty} {item.unit} available
              </p>
              <div className="mt-2 flex items-center justify-between">
                <button
                  onClick={() => onQuantityChange(item, Math.max(0, qty - 1))}
                  disabled={qty === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E2E8F0] text-[#64748B] hover:border-[#C0392B] hover:text-[#C0392B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span
                  className={`text-sm font-semibold ${
                    qty > 0 ? 'text-[#C0392B]' : 'text-[#94A3B8]'
                  }`}
                >
                  {qty}
                </span>
                <button
                  onClick={() => onQuantityChange(item, Math.min(item.available_qty, qty + 1))}
                  disabled={qty >= item.available_qty}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E2E8F0] text-[#64748B] hover:border-[#C0392B] hover:text-[#C0392B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
