'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBranchFilter } from '@/hooks/use-branch-filter'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useSearchParams, useRouter } from 'next/navigation'

interface DashboardStats {
  pendingApprovals: number
  requestsThisMonth: number
  dispatchesToday: number
  dispatchesThisMonth: number
  totalUsers: number
}

interface LowStockItem {
  id: string
  name: string
  branchName: string
  quantity: number
  maxLimit: number
  status: 'critical' | 'low'
}

interface CategoryChartData {
  labels: string[]
  values: number[]
}

const CHART_COLORS = ['#C41E3A', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#6B7280']

// ── Skeleton Components ──
function KpiSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 animate-pulse">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 bg-gray-200 rounded-md" />
        <div className="h-3 w-20 bg-gray-200 rounded" />
      </div>
      <div className="h-6 w-12 bg-gray-200 rounded mt-1" />
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex flex-col animate-pulse">
      <div className="h-4 w-36 bg-gray-200 rounded mb-1" />
      <div className="h-2.5 w-24 bg-gray-100 rounded mb-3" />
      <div className="flex-1 flex items-center justify-center" style={{ minHeight: '220px' }}>
        <div className="w-40 h-40 bg-gray-100 rounded-full" />
      </div>
    </div>
  )
}

function StockSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex flex-col animate-pulse">
      <div className="h-4 w-28 bg-gray-200 rounded mb-1" />
      <div className="h-2.5 w-36 bg-gray-100 rounded mb-3" />
      <div className="space-y-2 flex-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
            <div>
              <div className="h-3 w-24 bg-gray-200 rounded mb-1" />
              <div className="h-2.5 w-16 bg-gray-100 rounded" />
            </div>
            <div className="h-5 w-14 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const supabase = createClient()
  const { selectedBranchId, setSelectedBranch, branches } = useBranchFilter()
  const { user: currentUser } = useCurrentUser()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Sync branch from URL on mount (once)
  const initialSynced = useRef(false)
  useEffect(() => {
    if (initialSynced.current || branches.length === 0) return
    initialSynced.current = true
    const urlBranch = searchParams.get('branch')
    if (urlBranch) {
      const found = branches.find(b => b.name.toLowerCase().replace(/\s+/g, '-') === urlBranch)
      if (found && found.id !== selectedBranchId) {
        setSelectedBranch(found.id, found.name)
      }
    }
  }, [branches]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update URL when branch changes (not on searchParams change)
  const prevBranchRef = useRef(selectedBranchId)
  useEffect(() => {
    if (!initialSynced.current) return
    if (prevBranchRef.current === selectedBranchId) return
    prevBranchRef.current = selectedBranchId

    if (selectedBranchId) {
      const branch = branches.find(b => b.id === selectedBranchId)
      if (branch) {
        router.replace(`?branch=${branch.name.toLowerCase().replace(/\s+/g, '-')}`, { scroll: false })
      }
    } else {
      router.replace('/dashboard', { scroll: false })
    }
  }, [selectedBranchId, branches, router])

  // Separate loading states for progressive rendering
  const [statsLoading, setStatsLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    pendingApprovals: 0,
    requestsThisMonth: 0,
    dispatchesToday: 0,
    dispatchesThisMonth: 0,
    totalUsers: 0,
  })
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [categoryChartData, setCategoryChartData] = useState<CategoryChartData>({ labels: [], values: [] })

  // Cache fetched data per branchId to avoid refetching on tab switches
  const cache = useRef<Map<string, { stats: DashboardStats; lowStock: LowStockItem[]; chart: CategoryChartData }>>(new Map())

  const fetchDashboardData = useCallback(async () => {
    const cacheKey = selectedBranchId || '__all__'
    const cached = cache.current.get(cacheKey)
    if (cached) {
      setStats(cached.stats)
      setLowStockItems(cached.lowStock)
      setCategoryChartData(cached.chart)
      setStatsLoading(false)
      setChartLoading(false)
      return
    }

    setStatsLoading(true)
    setChartLoading(true)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    const branchFilterSR = (query: any) => selectedBranchId ? query.eq('branch_id', selectedBranchId) : query
    const branchFilterBS = (query: any) => selectedBranchId ? query.eq('branch_id', selectedBranchId) : query

    // ── Phase 1: KPI counts (fast, head-only queries) ──
    const [pendingRes, requestsMonthRes, dispatchesTodayRes, dispatchesMonthRes, totalUsersRes] = await Promise.all([
      branchFilterSR(supabase.from('stock_requests').select('id', { count: 'exact', head: true })
        .or('status.eq.pending_rm_approval,status.eq.pending_hr_approval,status.eq.manager_approved')),
      branchFilterSR(supabase.from('stock_requests').select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth)),
      branchFilterSR(supabase.from('stock_requests').select('id', { count: 'exact', head: true })
        .eq('status', 'dispatched').gte('updated_at', startOfDay)),
      branchFilterSR(supabase.from('stock_requests').select('id', { count: 'exact', head: true })
        .eq('status', 'dispatched').gte('updated_at', startOfMonth)),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true),
    ])

    const newStats: DashboardStats = {
      pendingApprovals: pendingRes.count || 0,
      requestsThisMonth: requestsMonthRes.count || 0,
      dispatchesToday: dispatchesTodayRes.count || 0,
      dispatchesThisMonth: dispatchesMonthRes.count || 0,
      totalUsers: totalUsersRes.count || 0,
    }
    setStats(newStats)
    setStatsLoading(false) // KPI cards visible immediately

    // ── Phase 2: Heavy data (stock + chart data) ──
    const [branchStockRes, categoriesRes, itemsRes] = await Promise.all([
      branchFilterBS(supabase.from('branch_stock').select('id, branch_id, quantity, max_limit, branch:branches!branch_id(name), item:items!item_id(name)')),
      supabase.from('categories').select('id, name').eq('is_active', true),
      supabase.from('items').select('id, category_id'),
    ])

    // Low stock
    const branchStockData = (branchStockRes.data || []) as any[]
    const lowItems: LowStockItem[] = []
    for (const bs of branchStockData) {
      const qty = bs.quantity || 0
      const maxL = bs.max_limit || 0
      let stockStatus: 'critical' | 'low' | null = null
      if (maxL > 0) {
        const pct = (qty / maxL) * 100
        if (pct <= 10) stockStatus = 'critical'
        else if (pct <= 30) stockStatus = 'low'
      } else if (qty < 10 && qty > 0) {
        stockStatus = 'low'
      }
      if (stockStatus) {
        lowItems.push({
          id: bs.id,
          name: bs.item?.name || 'Unknown',
          branchName: bs.branch?.name || '—',
          quantity: qty,
          maxLimit: maxL,
          status: stockStatus,
        })
      }
    }
    lowItems.sort((a, b) => {
      if (a.status === 'critical' && b.status !== 'critical') return -1
      if (a.status !== 'critical' && b.status === 'critical') return 1
      return a.quantity - b.quantity
    })
    const slicedLow = lowItems.slice(0, 5)
    setLowStockItems(slicedLow)

    // Category distribution
    const itemsList = (itemsRes.data || []) as any[]
    const categoriesList = (categoriesRes.data || []) as { id: string; name: string }[]
    const catMap = new Map(categoriesList.map(c => [c.id, c.name]))
    const catCounts: Record<string, number> = {}
    for (const item of itemsList) {
      const catName = catMap.get(item.category_id) || 'Other'
      catCounts[catName] = (catCounts[catName] || 0) + 1
    }
    const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1])
    const newChart = { labels: sortedCats.map(c => c[0]), values: sortedCats.map(c => c[1]) }
    setCategoryChartData(newChart)
    setChartLoading(false)

    // Save to cache
    cache.current.set(cacheKey, { stats: newStats, lowStock: slicedLow, chart: newChart })
  }, [selectedBranchId, supabase])

  useEffect(() => { fetchDashboardData() }, [fetchDashboardData])

  // Load Plotly lazily — only after stats are visible
  const plotlyLoaded = useRef(false)
  useEffect(() => {
    if (statsLoading || plotlyLoaded.current) return
    if (typeof (window as any).Plotly !== 'undefined') { plotlyLoaded.current = true; return }
    plotlyLoaded.current = true
    const script = document.createElement('script')
    script.src = 'https://cdn.plot.ly/plotly-2.35.2.min.js'
    script.async = true
    document.head.appendChild(script)
  }, [statsLoading])

  // Render chart when both data and Plotly are ready
  useEffect(() => {
    if (chartLoading || categoryChartData.labels.length === 0) return
    renderChart()
  }, [chartLoading, categoryChartData])

  const renderChart = () => {
    if (typeof (window as any).Plotly === 'undefined') {
      setTimeout(renderChart, 200)
      return
    }
    try {
      const totalItems = categoryChartData.values.reduce((s, v) => s + v, 0)
      const el = document.getElementById('category-chart')
      if (el) {
        ;(window as any).Plotly.newPlot('category-chart', [{
          labels: categoryChartData.labels,
          values: categoryChartData.values,
          type: 'pie',
          hole: 0.5,
          marker: { colors: CHART_COLORS.slice(0, categoryChartData.labels.length) },
          textinfo: 'label+percent',
          textposition: 'outside',
        }], {
          margin: { t: 5, r: 5, b: 5, l: 5 },
          plot_bgcolor: '#ffffff',
          paper_bgcolor: '#ffffff',
          showlegend: false,
          annotations: [{
            text: `${totalItems}<br>Items`,
            font: { size: 13, color: '#111827', family: 'Inter' },
            showarrow: false, x: 0.5, y: 0.5,
          }],
        }, { responsive: true, displayModeBar: false, displaylogo: false })
      }
    } catch (e) { console.error('Category chart error:', e) }
  }

  return (
    <>
      <div className="p-4 flex flex-col h-full">
        {/* Header */}
        <div className="mb-3">
          <h1 className="text-lg font-bold text-gray-800">System Overview</h1>
          <p className="text-xs text-gray-600">Monitor all branches and operations in real-time</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
          {statsLoading ? (
            <>{[1,2,3,4,5].map(i => <KpiSkeleton key={i} />)}</>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 bg-orange-100 rounded-md flex items-center justify-center">
                    <i className="fas fa-clock text-orange-600 text-xs"></i>
                  </div>
                  <p className="text-xs text-gray-600">Pending Approvals</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{stats.pendingApprovals}</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 bg-blue-100 rounded-md flex items-center justify-center">
                    <i className="fas fa-file-lines text-blue-600 text-xs"></i>
                  </div>
                  <p className="text-xs text-gray-600">Requests This Month</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{stats.requestsThisMonth}</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 bg-green-100 rounded-md flex items-center justify-center">
                    <i className="fas fa-truck-fast text-green-600 text-xs"></i>
                  </div>
                  <p className="text-xs text-gray-600">Dispatches Today</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{stats.dispatchesToday}</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 bg-green-100 rounded-md flex items-center justify-center">
                    <i className="fas fa-truck text-green-600 text-xs"></i>
                  </div>
                  <p className="text-xs text-gray-600">Dispatches This Month</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{stats.dispatchesThisMonth}</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 bg-purple-100 rounded-md flex items-center justify-center">
                    <i className="fas fa-users text-purple-600 text-xs"></i>
                  </div>
                  <p className="text-xs text-gray-600">Total Users</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </>
          )}
        </div>

        {/* Analytics Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1">
          {/* Category Distribution Chart */}
          {chartLoading ? <ChartSkeleton /> : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Category Distribution</h3>
                  <p className="text-[10px] text-gray-600">Current inventory mix</p>
                </div>
              </div>
              <div id="category-chart" className="flex-1" style={{ minHeight: '220px' }}></div>
              {categoryChartData.labels.length === 0 && (
                <p className="text-xs text-gray-400 text-center mt-2">No category data available</p>
              )}
            </div>
          )}

          {/* Stock Overview Card */}
          {chartLoading ? <StockSkeleton /> : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Stock Overview</h3>
                  <p className="text-[10px] text-gray-600">Branch stock levels at a glance</p>
                </div>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto">
                {lowStockItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs">All stock levels are healthy</div>
                ) : (
                  lowStockItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.branchName}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs font-medium text-gray-900">{item.quantity} / {item.maxLimit || '∞'}</p>
                          <p className="text-xs text-gray-500">qty / limit</p>
                        </div>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          item.status === 'critical' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                        }`}>
                          {item.status === 'critical' ? 'Critical' : 'Low'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
