export const revalidate = 30

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConsumptionLineChart } from '@/components/charts/ConsumptionLineChart'
import { BranchComparisonBar } from '@/components/charts/BranchComparisonBar'
import { CategoryPieChart } from '@/components/charts/CategoryPieChart'
import { AgingHeatmap } from '@/components/charts/AgingHeatmap'
import { createServiceClient } from '@/lib/supabase/server'

export default async function SuperAdminReportsPage() {
  const supabase = await createServiceClient()

  const [reqResult, branchResult, distResult] = await Promise.all([
    supabase
      .from('requisitions')
      .select('id, status, created_at, recipient_type, branch:branches(name)')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('branches').select('id, name').eq('is_active', true).order('name'),
    supabase
      .from('distributions')
      .select('id, dispatched_at, requisition:requisitions(branch_id, recipient_type)')
      .order('dispatched_at', { ascending: false })
      .limit(200),
  ])

  const branches = branchResult.data ?? []

  // Last 30 days
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return d.toISOString().slice(0, 10)
  })

  // Single-pass aggregation
  const reqsByDay: Record<string, number> = {}
  const distsByDay: Record<string, number> = {}
  const reqsByBranch: Record<string, number> = {}
  const distsByBranch: Record<string, number> = {}
  const catMap: Record<string, number> = {}
  const agingByBranch: Record<string, { '0-1d': number; '1-2d': number; '2-3d': number; '3d+': number }> = {}

  const now = Date.now()
  for (const r of reqResult.data ?? []) {
    const day = r.created_at?.slice(5, 10) ?? ''
    reqsByDay[day] = (reqsByDay[day] ?? 0) + 1
    const bName = ((r.branch as { name?: string })?.name ?? 'Unknown').slice(0, 12)
    reqsByBranch[bName] = (reqsByBranch[bName] ?? 0) + 1
    const cat = (r.recipient_type as string) ?? 'unknown'
    catMap[cat] = (catMap[cat] ?? 0) + 1
    const age = (now - new Date(r.created_at).getTime()) / 86400000
    if (!agingByBranch[bName]) agingByBranch[bName] = { '0-1d': 0, '1-2d': 0, '2-3d': 0, '3d+': 0 }
    if (age <= 1) agingByBranch[bName]['0-1d']++
    else if (age <= 2) agingByBranch[bName]['1-2d']++
    else if (age <= 3) agingByBranch[bName]['2-3d']++
    else agingByBranch[bName]['3d+']++
  }
  for (const d of distResult.data ?? []) {
    const day = d.dispatched_at?.slice(5, 10) ?? ''
    distsByDay[day] = (distsByDay[day] ?? 0) + 1
    const bName = ((d.requisition as { branch?: { name?: string } })?.branch?.name ?? 'Unknown').slice(0, 12)
    distsByBranch[bName] = (distsByBranch[bName] ?? 0) + 1
  }

  const consumptionData = days.map((day) => ({
    date: day.slice(5),
    requests: reqsByDay[day.slice(5)] ?? 0,
    dispatched: distsByDay[day.slice(5)] ?? 0,
  }))
  const branchData = (branchResult.data ?? []).map((b) => {
    const key = (b.name as string).slice(0, 12)
    return { branch: key, requests: reqsByBranch[key] ?? 0, dispatched: distsByBranch[key] ?? 0 }
  })
  const categoryData = Object.entries(catMap).map(([name, value]) => ({ name, value }))
  const agingData = (branchResult.data ?? []).map((b) => {
    const key = (b.name as string).slice(0, 12)
    const a = agingByBranch[key] ?? { '0-1d': 0, '1-2d': 0, '2-3d': 0, '3d+': 0 }
    return { branch: key, ...a }
  })

  return (
    <div>
      <PageHeader
        title="Reports"
        description="System-wide analytics and trends (last 30 days)"
      />
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Requests vs Dispatches</CardTitle>
          </CardHeader>
          <CardContent>
            <ConsumptionLineChart data={consumptionData} />
          </CardContent>
        </Card>
      </div>
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Branch Activity Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <BranchComparisonBar data={branchData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requests by Recipient Type</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={categoryData} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aging Heatmap (Active Requisitions)</CardTitle>
        </CardHeader>
        <CardContent>
          <AgingHeatmap data={agingData} />
        </CardContent>
      </Card>
    </div>
  )
}
