"use client"

import { useState, useEffect, useCallback } from 'react'
import { User } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useBranchFilter } from '@/hooks/use-branch-filter'

interface DispatchRow {
  id: string
  requestNumber: string
  requester: string
  branch: string
  itemCount: number
  unitCount: number
  createdAt: string
  expectedDate: string | null
  status: string
}

const statusLabels: Record<string, string> = {
  pending_for_dispatch: 'Pending For Dispatch',
  ready_for_dispatch: 'Ready for Dispatch',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
}

const statusColors: Record<string, string> = {
  pending_for_dispatch: 'bg-amber-100 text-amber-700',
  ready_for_dispatch: 'bg-blue-100 text-blue-700',
  dispatched: 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
}

export default function DispatchesPage() {
  const supabase = createClient()
  const { selectedBranchId } = useBranchFilter()
  const [user, setUser] = useState<User | null>(null)
  const [rows, setRows] = useState<DispatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending_for_dispatch' | 'ready_for_dispatch' | 'dispatched' | 'delivered'>('pending_for_dispatch')
  const [toast, setToast] = useState<{ title: string; message: string } | null>(null)
  const [isToastVisible, setIsToastVisible] = useState(false)

  const showToast = (title: string, message: string) => {
    setToast({ title, message })
    setIsToastVisible(true)
    setTimeout(() => setIsToastVisible(false), 3000)
  }

  const fetchRows = useCallback(async () => {
    setLoading(true)

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const { data: profile } = await supabase
        .from('users')
        .select('id, full_name, email, phone, role_id, branch_id, reporting_manager, is_active, created_at')
        .eq('id', authUser.id)
        .single()
      if (profile) {
        setUser({
          id: profile.id,
          name: profile.full_name,
          email: profile.email || '',
          phone: profile.phone || '',
          role_id: profile.role_id || '',
          branch_id: profile.branch_id || null,
          reporting_manager: profile.reporting_manager || null,
          is_active: profile.is_active,
          created_at: profile.created_at,
        })
      }
    }

    let query = supabase
      .from('stock_requests')
      .select(`
        id,
        request_number,
        status,
        created_at,
        expected_date,
        requester:users!requested_by ( full_name ),
        branch:branches!branch_id ( name ),
        stock_request_items ( quantity )
      `)
      .in('status', ['pending_for_dispatch', 'ready_for_dispatch', 'dispatched', 'delivered'])
      .order('created_at', { ascending: false })

    if (selectedBranchId) {
      query = query.eq('branch_id', selectedBranchId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching dispatch rows:', error)
      setRows([])
    } else {
      setRows((data || []).map((r: any) => {
        const items: { quantity: number }[] = r.stock_request_items || []
        return {
          id: r.id,
          requestNumber: r.request_number || r.id.slice(0, 8),
          requester: r.requester?.full_name || 'Unknown',
          branch: r.branch?.name || '—',
          itemCount: items.length,
          unitCount: items.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0),
          createdAt: r.created_at,
          expectedDate: r.expected_date,
          status: r.status,
        }
      }))
    }
    setLoading(false)
  }, [supabase, selectedBranchId])

  useEffect(() => { fetchRows() }, [fetchRows])

  const updateStatus = async (id: string, newStatus: string) => {
    const updateData: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'dispatched') {
      updateData.dispatched_by = user?.id
    }
    await supabase.from('stock_requests').update(updateData).eq('id', id)
    showToast('Status Updated', `Request marked as ${statusLabels[newStatus]}`)
    fetchRows()
  }

  const filteredRows = rows.filter(r => r.status === tab)

  const countByStatus = (s: string) => rows.filter(r => r.status === s).length

  return (
    <>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dispatch Queue</h1>
              <p className="text-sm text-gray-500">Manage approved requisitions through dispatch workflow</p>
            </div>
            <button onClick={fetchRows} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all flex items-center">
              <i className="fa-solid fa-arrows-rotate mr-2"></i>Refresh
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Pending For Dispatch', count: countByStatus('pending_for_dispatch'), icon: 'fa-clock', color: 'text-amber-500' },
              { label: 'Ready for Dispatch', count: countByStatus('ready_for_dispatch'), icon: 'fa-box-open', color: 'text-blue-500' },
              { label: 'Dispatched', count: countByStatus('dispatched'), icon: 'fa-truck', color: 'text-purple-500' },
              { label: 'Delivered', count: countByStatus('delivered'), icon: 'fa-check-circle', color: 'text-emerald-500' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">{s.label}</span>
                  <i className={`fa-solid ${s.icon} text-xl ${s.color}`}></i>
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.count}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex items-center space-x-2 mb-4">
            {(['pending_for_dispatch', 'ready_for_dispatch', 'dispatched', 'delivered'] as const).map(s => (
              <button
                key={s}
                onClick={() => setTab(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tab === s ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {statusLabels[s]}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  tab === s ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-600'
                }`}>{countByStatus(s)}</span>
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Req ID</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Requester</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Branch</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase">Items</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Requested</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase">Expected Date</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-gray-500 text-sm">
                        <i className="fa-solid fa-spinner animate-spin mr-2"></i>Loading...
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-gray-500 text-sm">
                        No requests in this status
                      </td>
                    </tr>
                  ) : filteredRows.map(row => (
                    <tr key={row.id} className="border-t hover:bg-gray-50 transition-all">
                      <td className="px-5 py-3">
                        <span className="text-sm font-medium text-gray-900">{row.requestNumber}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-semibold text-[10px]">
                            {row.requester.charAt(0)}
                          </div>
                          <span className="text-sm text-gray-900">{row.requester}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700">{row.branch}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-sm font-medium text-gray-900">{row.itemCount} items</span>
                        <div className="text-[10px] text-gray-500">{row.unitCount} units</div>
                      </td>
                      <td className="px-5 py-3 text-[11px] text-gray-500">
                        {new Date(row.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3 text-[11px] text-gray-700">
                        {row.expectedDate ? new Date(row.expectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${statusColors[row.status] || 'bg-gray-100 text-gray-700'}`}>
                          {statusLabels[row.status] || row.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {row.status === 'pending_for_dispatch' && (
                          <button
                            onClick={() => updateStatus(row.id, 'ready_for_dispatch')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all"
                          >
                            <i className="fa-solid fa-box-open mr-1"></i>Ready for Dispatch
                          </button>
                        )}
                        {row.status === 'ready_for_dispatch' && (
                          <button
                            onClick={() => updateStatus(row.id, 'dispatched')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-all"
                          >
                            <i className="fa-solid fa-truck mr-1"></i>Dispatch
                          </button>
                        )}
                        {row.status === 'dispatched' && (
                          <button
                            onClick={() => updateStatus(row.id, 'delivered')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
                          >
                            <i className="fa-solid fa-check mr-1"></i>Delivered
                          </button>
                        )}
                        {row.status === 'delivered' && (
                          <span className="text-[11px] text-emerald-600 font-medium">
                            <i className="fa-solid fa-circle-check mr-1"></i>Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-5 py-4 rounded-xl border border-gray-200 shadow-2xl flex items-center space-x-3 transition-transform duration-200 bg-white z-[100] ${
            isToastVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <i className="fa-solid fa-check-circle text-xl text-emerald-500"></i>
          <div>
            <div className="text-sm font-semibold text-gray-900">{toast.title}</div>
            <div className="text-xs text-gray-500">{toast.message}</div>
          </div>
        </div>
      )}
    </>
  )
}
