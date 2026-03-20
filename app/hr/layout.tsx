import { getSession } from '@/lib/auth'
import { AppSidebar } from '@/components/shared/AppSidebar'
import { NotificationBell } from '@/components/shared/NotificationBell'

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AppSidebar role="hr" userName={session.name} branchName={session.branchName} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-end border-b border-[#E2E8F0] bg-white px-6 pl-16 lg:pl-6">
          <NotificationBell userId={session.userId} />
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
