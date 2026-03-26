import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 30
import { Package, Users, ClipboardList, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import type { Requisition, Inventory } from '@/types'

export default async function BranchAdminDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/sign-in')
  const branchId = session.branchId

  const supabase = await createServiceClient()

  const [invResult, reqResult, userCountResult] = await Promise.all([
    supabase
      .from('inventory')
      .select('*, item:pop_items(name, unit, low_stock_threshold)')
      .eq('branch_id', branchId ?? '')
      .order('quantity_on_hand', { ascending: true })
      .limit(5),
    supabase
      .from('requisitions')
      .select('*, lines:requisition_lines(id)')
      .eq('branch_id', branchId ?? '')
      .not('status', 'in', '("closed","voided")')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', branchId ?? ''),
  ])

  const inventory = (invResult.data ?? []) as Inventory[]
  const requisitions = (reqResult.data ?? []) as Requisition[]
  const userCount = userCountResult.count ?? 0
  const lowStock = inventory.filter(
    (i) => i.quantity_on_hand <= ((i.item as { low_stock_threshold?: number })?.low_stock_threshold ?? 5)
  )

  return (
    <div>
      <PageHeader
        title="Branch Admin Dashboard"
        description={`Managing ${session.branchName ?? 'your branch'}`}
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B]">Staff Members</p>
                <p className="text-2xl font-bold text-[#1A1A2E]">{userCount}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF6FF]">
                <Users className="h-5 w-5 text-[#3B82F6]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B]">Active Requests</p>
                <p className="text-2xl font-bold text-[#E67E22]">{requisitions.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEF3C7]">
                <ClipboardList className="h-5 w-5 text-[#E67E22]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B]">Low Stock Items</p>
                <p className="text-2xl font-bold text-[#E74C3C]">{lowStock.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEE2E2]">
                <AlertTriangle className="h-5 w-5 text-[#E74C3C]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B]">Total SKUs</p>
                <p className="text-2xl font-bold text-[#27AE60]">{inventory.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DCFCE7]">
                <Package className="h-5 w-5 text-[#27AE60]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Requisitions</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/branch-admin/requisitions">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {requisitions.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#64748B]">No active requisitions</p>
            ) : (
              <div className="space-y-2">
                {requisitions.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-lg border border-[#E2E8F0] p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        #{req.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-[#64748B] capitalize">
                        {req.recipient_type} · {formatDate(req.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Low Stock Alert</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/branch-admin/inventory">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#64748B]">All stock levels OK</p>
            ) : (
              <div className="space-y-2">
                {lowStock.slice(0, 5).map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border border-[#FCA5A5] bg-[#FFF5F5] p-3"
                  >
                    <p className="text-sm font-medium">
                      {(inv.item as { name?: string })?.name ?? '—'}
                    </p>
                    <Badge variant="danger">
                      {inv.quantity_on_hand} {(inv.item as { unit?: string })?.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
