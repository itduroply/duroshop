'use client'
import { Bell, Check, Package, X, Clock, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { formatRelativeTime, cn } from '@/lib/utils'

const eventIcons: Record<string, React.ReactNode> = {
  requisition_approved:   <Check className="h-4 w-4 text-[#27AE60]" />,
  requisition_rejected:   <X className="h-4 w-4 text-[#E74C3C]" />,
  requisition_dispatched: <Package className="h-4 w-4 text-[#7C3AED]" />,
  requisition_voided:     <Clock className="h-4 w-4 text-[#E67E22]" />,
  requisition_submitted:  <Clock className="h-4 w-4 text-[#2563EB]" />,
  requisition_hr_pending: <Clock className="h-4 w-4 text-[#2563EB]" />,
}

interface NotificationBellProps {
  userId: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(userId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#C0392B] text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-[#C0392B] hover:bg-transparent"
              onClick={markAllRead}
            >
              <CheckCheck className="mr-1 h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <Bell className="mb-2 h-8 w-8 text-[#E2E8F0]" />
            <p className="text-sm text-[#64748B]">No notifications yet</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={cn(
                  'flex cursor-pointer items-start gap-3 px-3 py-2.5',
                  !n.read && 'bg-[#FEF9F9]'
                )}
                onClick={() => markRead(n.id)}
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F8FAFC]">
                  {eventIcons[n.event_type] ?? <Bell className="h-4 w-4 text-[#64748B]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-xs leading-snug',
                      !n.read ? 'font-medium text-[#1A1A2E]' : 'text-[#64748B]'
                    )}
                  >
                    {n.message}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#94A3B8]">
                    {formatRelativeTime(n.created_at)}
                  </p>
                </div>
                {!n.read && (
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#C0392B]" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
