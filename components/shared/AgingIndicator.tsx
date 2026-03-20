import { Clock } from 'lucide-react'
import { getAgingDays, getAgingColor, getAgingLabel } from '@/lib/utils'

interface AgingIndicatorProps {
  createdAt: string
  className?: string
}

export function AgingIndicator({ createdAt, className }: AgingIndicatorProps) {
  const days = getAgingDays(createdAt)
  const color = getAgingColor(days)
  const label = getAgingLabel(days)

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className ?? ''}`}
      style={{ backgroundColor: `${color}20`, color }}
    >
      <Clock className="h-3 w-3" />
      {days === 0 ? 'Today' : `${days}d`} · {label}
    </span>
  )
}
