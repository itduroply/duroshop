import { Badge } from '@/components/ui/badge'

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'gray'; label: string }> = {
  active:          { variant: 'success',     label: 'Active' },
  inactive:        { variant: 'gray',        label: 'Inactive' },
  paused:          { variant: 'warning',     label: 'Paused' },
  completed:       { variant: 'gray',        label: 'Completed' },
  draft:           { variant: 'gray',        label: 'Draft' },
  submitted:       { variant: 'info',        label: 'Submitted' },
  manager_pending: { variant: 'info',        label: 'Pending Manager' },
  hr_pending:      { variant: 'info',        label: 'Pending HR' },
  approved:        { variant: 'success',     label: 'Approved' },
  rejected:        { variant: 'danger',      label: 'Rejected' },
  voided:          { variant: 'gray',        label: 'Voided' },
  dispatched:      { variant: 'purple',      label: 'Dispatched' },
  closed:          { variant: 'default',     label: 'Closed' },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { variant: 'gray' as const, label: status }
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
