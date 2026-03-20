import { Building2, Users, ClipboardList, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConsumptionLineChart } from '@/components/charts/ConsumptionLineChart'
import { BranchComparisonBar } from '@/components/charts/BranchComparisonBar'
import { CategoryPieChart } from '@/components/charts/CategoryPieChart'
import { AgingHeatmap } from '@/components/charts/AgingHeatmap'
import { createServiceClient } from '@/lib/supabase/server'

export default async function SuperAdminDashboardPage() {
  const supabase = await createServiceClient()

  const [branchCount, userCount, reqCount, itemCount, recentReqs, branchStats] =
    await Promise.all([
      supabase.from('branches').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('requisitions').select('id', { count: 'exact', head: true }),
      supabase.from('pop_items').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase
        .from('requisitions')
        .select('id, status, created_at, branch:branches(name), recipient_type')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
    ])

  const stats = [
    { label: 'Active Branches', value: branchCount.count ?? 0, icon: Building2, color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Total Users', value: userCount.count ?? 0, icon: Users, color: '#27AE60', bg: '#DCFCE7' },
    { label: 'Total Requests', value: reqCount.count ?? 0, icon: ClipboardList, color: '#E67E22', bg: '#FEF3C7' },
    { label: 'Active SKUs', value: itemCount.count ?? 0, icon: Package, color: '#C0392B', bg: '#FEE2E2' },
  ]

  // Build consumption data for last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
  const consumptionData = days.map((day) => ({
    date: day.slice(5),
    requests: (recentReqs.data ?? []).filter((r) => r.created_at?.startsWith(day)).length,
  }))

  // Branch comparison
  const branchData = (branchStats.data ?? []).map((b) => ({
    branch: (b.name as string).slice(0, 12),
    requests: (recentReqs.data ?? []).filter(
      (r) => (r.branch as { name?: string })?.name === b.name
    ).length,
  }))

  // Category breakdown (simplified from recipient_type)
  const catMap: Record<string, number> = {}
  for (const r of recentReqs.data ?? []) {
    const k = (r.recipient_type as string) ?? 'unknown'
    catMap[k] = (catMap[k] ?? 0) + 1
  }
  const categoryData = Object.entries(catMap).map(([name, value]) => ({ name, value }))

  // Aging heatmap data
  const agingData = (branchStats.data ?? []).map((b) => {
    const bReqs = (recentReqs.data ?? []).filter(
      (r) => (r.branch as { name?: string })?.name === b.name
    )
    return {
      branch: (b.name as string).slice(0, 12),
      '0-1d': bReqs.filter((r) => {
        const age = (Date.now() - new Date(r.created_at).getTime()) / 86400000
        return age <= 1
      }).length,
      '1-2d': bReqs.filter((r) => {
        const age = (Date.now() - new Date(r.created_at).getTime()) / 86400000
        return age > 1 && age <= 2
      }).length,
      '2-3d': bReqs.filter((r) => {
        const age = (Date.now() - new Date(r.created_at).getTime()) / 86400000
        return age > 2 && age <= 3
      }).length,
      '3d+': bReqs.filter((r) => {
        const age = (Date.now() - new Date(r.created_at).getTime()) / 86400000
        return age > 3
      }).length,
    }
  })

  return (
    <div>
      <PageHeader
        title="Super Admin Dashboard"
        description="System-wide overview of DuroShop operations"
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B]">{s.label}</p>
                  <p className="text-2xl font-bold text-[#1A1A2E]">{s.value}</p>
                </div>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: s.bg }}
                >
                  <s.icon className="h-5 w-5" style={{ color: s.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requests (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ConsumptionLineChart data={consumptionData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requests by Branch</CardTitle>
          </CardHeader>
          <CardContent>
            <BranchComparisonBar data={branchData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requests by Recipient Type</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={categoryData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aging Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <AgingHeatmap data={agingData} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
