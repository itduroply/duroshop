import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:     'border-transparent bg-[#1E293B] text-[#F8FAFC]',
        secondary:   'border-transparent bg-[#F1F5F9] text-[#64748B]',
        destructive: 'border-transparent bg-[#FEE2E2] text-[#DC2626]',
        outline:     'border-[#E2E8F0] text-[#1A1A2E]',
        success:     'border-transparent bg-[#DCFCE7] text-[#16A34A]',
        warning:     'border-transparent bg-[#FEF3C7] text-[#D97706]',
        danger:      'border-transparent bg-[#FEE2E2] text-[#DC2626]',
        info:        'border-transparent bg-[#DBEAFE] text-[#2563EB]',
        purple:      'border-transparent bg-[#F3E8FF] text-[#7C3AED]',
        gray:        'border-transparent bg-[#F1F5F9] text-[#64748B]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
