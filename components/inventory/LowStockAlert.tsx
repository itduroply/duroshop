import { AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { Inventory } from '@/types'
import Link from 'next/link'

interface LowStockAlertProps {
  items: Inventory[]
  href?: string
}

export function LowStockAlert({ items, href }: LowStockAlertProps) {
  if (items.length === 0) return null
  return (
    <Card className="border-[#E67E22]/30 bg-[#FFFBF5]">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7]">
            <AlertTriangle className="h-4 w-4 text-[#E67E22]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#1A1A2E]">
              {items.length} item{items.length > 1 ? 's' : ''} running low on stock
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {items.slice(0, 5).map((inv) => (
                <span
                  key={inv.id}
                  className="inline-flex items-center rounded-full bg-[#FEF3C7] px-2 py-0.5 text-xs text-[#D97706]"
                >
                  {inv.item?.name} ({inv.available_qty} left)
                </span>
              ))}
              {items.length > 5 && (
                <span className="text-xs text-[#64748B]">+{items.length - 5} more</span>
              )}
            </div>
            {href && (
              <Link href={href} className="mt-2 inline-block text-xs text-[#C0392B] hover:underline">
                View all low stock items →
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
