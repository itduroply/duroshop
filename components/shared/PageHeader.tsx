import { Separator } from '@/components/ui/separator'

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">{title}</h1>
          {description && <p className="mt-1 text-sm text-[#64748B]">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <Separator className="mt-4" />
    </div>
  )
}
