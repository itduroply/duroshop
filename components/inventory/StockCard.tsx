import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { Inventory } from '@/types'

interface StockCardProps {
  inventory: Inventory
  onAdjust?: (inv: Inventory) => void
}

export function StockCard({ inventory, onAdjust }: StockCardProps) {
  const isLowStock = inventory.available_qty <= inventory.low_stock_threshold
  const maxQty = inventory.low_stock_threshold * 2 || 100
  const stockPercent = Math.min(100, (inventory.available_qty / maxQty) * 100)

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative h-32 bg-[#F8FAFC]">
        {inventory.item?.image_url ? (
          <Image
            src={inventory.item.image_url}
            alt={inventory.item.name ?? 'Item'}
            fill
            className="object-contain p-2"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-4xl font-bold text-[#E2E8F0]">
              {inventory.item?.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
          </div>
        )}
        {isLowStock && (
          <Badge variant="warning" className="absolute right-2 top-2 text-[10px]">
            Low Stock
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <p className="font-medium text-[#1A1A2E] line-clamp-1">{inventory.item?.name}</p>
        <p className="text-xs text-[#64748B]">{inventory.item?.sku}</p>
        {inventory.item?.category && (
          <Badge variant="outline" className="mt-1 text-xs">
            {inventory.item.category.name}
          </Badge>
        )}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-[#64748B]">Available</span>
            <span className={`font-semibold ${isLowStock ? 'text-[#E67E22]' : 'text-[#27AE60]'}`}>
              {inventory.available_qty} {inventory.item?.unit}
            </span>
          </div>
          <Progress value={stockPercent} className="h-1.5" />
          <div className="flex justify-between text-xs text-[#94A3B8]">
            <span>Issued: {inventory.issued_qty}</span>
            <span>Min: {inventory.low_stock_threshold}</span>
          </div>
        </div>
        {onAdjust && (
          <button
            onClick={() => onAdjust(inventory)}
            className="mt-3 w-full rounded-md border border-[#E2E8F0] px-3 py-1.5 text-xs font-medium text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
          >
            Adjust Stock
          </button>
        )}
      </CardContent>
    </Card>
  )
}
