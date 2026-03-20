import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ActivityLogsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-500">Monitor system activity and user actions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              View all system activities and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground">
              No activity logs found.
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
