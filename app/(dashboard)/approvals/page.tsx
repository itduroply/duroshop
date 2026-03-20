"use client"

import { useState, useEffect, useCallback } from 'react'
import { User } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useBranchFilter } from '@/hooks/use-branch-filter'

interface ApprovalRow {
  id: string
  date: string
  requester: {
    name: string
  }
  branch: {
    name: string
  }
  assignedTo: {
    name: string
  }
  items: {
    count: number
    units: number
  }
  aging: {
    days: number
    status: 'critical' | 'warning' | 'normal'
    label: string
  }
  priority: {
    label: string
    tone: 'critical' | 'high' | 'normal'
  }
  rawStatus: string
}

function computeAging(createdAt: string): ApprovalRow['aging'] {
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000))
  if (days >= 10) return { days, status: 'critical', label: `Overdue ${days - 7} days` }
  if (days >= 5) return { days, status: 'warning', label: 'Within SLA' }
  return { days, status: 'normal', label: 'Fresh' }
}

function computePriority(aging: ApprovalRow['aging']): ApprovalRow['priority'] {
  if (aging.status === 'critical') return { label: 'Critical', tone: 'critical' }
  if (aging.status === 'warning') return { label: 'High', tone: 'high' }
  return { label: 'Normal', tone: 'normal' }
}

const agingStyles = {
  critical: {
    row: 'bg-red-50/70',
    dot: 'bg-red-600',
    text: 'text-red-600',
    subText: 'text-red-500',
    accent: 'bg-red-600',
  },
  warning: {
    row: 'bg-orange-50/70',
    dot: 'bg-orange-500',
    text: 'text-orange-600',
    subText: 'text-orange-500',
    accent: 'bg-orange-500',
  },
  normal: {
    row: 'bg-white',
    dot: 'bg-green-500',
    text: 'text-green-600',
    subText: 'text-gray-500',
    accent: 'bg-transparent',
  },
}

const priorityStyles = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-blue-100 text-blue-700',
}

export default function ApprovalsPage() {
  const supabase = createClient()
  const { selectedBranchId } = useBranchFilter()
  const [user, setUser] = useState<User | null>(null)
  const [roleName, setRoleName] = useState<string>('')
  const [view, setView] = useState<'manager' | 'hr'>('manager')
  const [managerRows, setManagerRows] = useState<ApprovalRow[]>([])
  const [hrRows, setHrRows] = useState<ApprovalRow[]>([])
  const [loading, setLoading] = useState(true)

  const showManagerTab = roleName === 'Super Admin' || roleName === 'Manager'
  const showHrTab = roleName === 'Super Admin' || roleName === 'HR'

  const fetchApprovals = useCallback(async () => {
    setLoading(true)

    // Fetch current user
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const { data: profile } = await supabase
        .from('users')
        .select('id, full_name, email, phone, role_id, branch_id, reporting_manager, is_active, created_at, roles:role_id ( name )')
        .eq('id', authUser.id)
        .single()
      if (profile) {
        const userRoleName = (profile.roles as any)?.name || ''
        setRoleName(userRoleName)
        // Set default view based on role
        if (userRoleName === 'HR') {
          setView('hr')
        } else {
          setView('manager')
        }
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

    // Fetch pending RM approval requests
    let rmQuery = supabase
      .from('stock_requests')
      .select(`
        id,
        created_at,
        status,
        requested_by,
        branch_id,
        assigned_to,
        requester:users!requested_by ( full_name ),
        branch:branches!branch_id ( name ),
        assigned:users!assigned_to ( full_name ),
        stock_request_items ( quantity )
      `)
      .eq('status', 'pending_rm_approval')
      .order('created_at', { ascending: false })

    if (selectedBranchId) {
      rmQuery = rmQuery.eq('branch_id', selectedBranchId)
    }

    const { data: pendingData } = await rmQuery

    // Fetch pending HR approval requests
    let hrQuery = supabase
      .from('stock_requests')
      .select(`
        id,
        created_at,
        status,
        requested_by,
        branch_id,
        assigned_to,
        manager_approved_by,
        requester:users!requested_by ( full_name ),
        branch:branches!branch_id ( name ),
        approver:users!manager_approved_by ( full_name ),
        stock_request_items ( quantity )
      `)
      .eq('status', 'pending_hr_approval')
      .order('created_at', { ascending: false })

    if (selectedBranchId) {
      hrQuery = hrQuery.eq('branch_id', selectedBranchId)
    }

    const { data: hrData } = await hrQuery

    const mapRow = (r: any, assignedField: string): ApprovalRow => {
      const itemsArr: { quantity: number }[] = r.stock_request_items || []
      const count = itemsArr.length
      const units = itemsArr.reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0)
      const aging = computeAging(r.created_at)
      return {
        id: r.id,
        date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        requester: { name: r.requester?.full_name || 'Unknown' },
        branch: { name: r.branch?.name || '—' },
        assignedTo: { name: r[assignedField]?.full_name || '—' },
        items: { count, units },
        aging,
        priority: computePriority(aging),
        rawStatus: r.status,
      }
    }

    setManagerRows((pendingData || []).map((r: any) => mapRow(r, 'assigned')))
    setHrRows((hrData || []).map((r: any) => mapRow(r, 'approver')))
    setLoading(false)
  }, [supabase, selectedBranchId])

  useEffect(() => { fetchApprovals() }, [fetchApprovals])

  const handleApprove = async (row: ApprovalRow) => {
    if (row.rawStatus === 'pending_rm_approval') {
      // RM approval – check if any item in this request needs HR approval
      const { data: reqItems } = await supabase
        .from('stock_request_items')
        .select('item_id, items!item_id ( hr_approval )')
        .eq('stock_request_id', row.id)

      const needsHr = (reqItems || []).some((ri: any) => ri.items?.hr_approval === true)

      await supabase
        .from('stock_requests')
        .update({
          status: needsHr ? 'pending_hr_approval' : 'pending_for_dispatch',
          manager_approved_by: user?.id,
        })
        .eq('id', row.id)
    } else if (row.rawStatus === 'pending_hr_approval') {
      // HR approval → pending for dispatch
      await supabase
        .from('stock_requests')
        .update({ status: 'pending_for_dispatch', hr_approved_by: user?.id })
        .eq('id', row.id)
    }
    fetchApprovals()
  }

  const handleReject = async (row: ApprovalRow) => {
    await supabase
      .from('stock_requests')
      .update({ status: 'rejected' })
      .eq('id', row.id)
    fetchApprovals()
  }

  const rows = view === 'manager' ? managerRows : hrRows

  return (
    <>
      <div className="bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-1.5 sticky top-0 z-40 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-0.5">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Global Approval Monitoring</h1>
            <p className="text-[11px] text-gray-600 mt-0">
              Super Admin oversight across all branches and approval stages
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium text-[11px] transition-all">
              <i className="fa-solid fa-download"></i>
              <span>Export</span>
            </button>
            <button className="flex items-center space-x-2 px-3.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium text-[11px] transition-all">
              <i className="fa-solid fa-bolt"></i>
              <span>Bulk Override</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white border border-gray-200 rounded-full p-1 shadow-sm">
            {showManagerTab && (
              <button
                onClick={() => setView('manager')}
                className={`px-3 py-0.5 rounded-full font-medium text-[11px] transition-all ${
                  view === 'manager'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <i className="fa-solid fa-user-tie mr-2"></i>Manager Approvals
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${
                    view === 'manager' ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {managerRows.length}
                </span>
              </button>
            )}
            {showHrTab && (
              <button
                onClick={() => setView('hr')}
                className={`px-3 py-0.5 rounded-full font-medium text-[11px] transition-all ${
                  view === 'hr'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <i className="fa-solid fa-users mr-2"></i>HR Approvals
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${
                    view === 'hr' ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {hrRows.length}
                </span>
              </button>
            )}
          </div>
          <div className="flex-1"></div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-gray-600">Sort by:</span>
            <select className="px-2 py-0.5 bg-white border border-gray-300 rounded-md text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-red-500">
              <option>Overdue First</option>
              <option>Newest First</option>
              <option>Branch</option>
              <option>Amount</option>
            </select>
          </div>
        </div>

      </div>

      <div className="p-4 space-y-2">
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2.5 py-2 text-center">
                    <input type="checkbox" className="w-4 h-4 text-red-600 rounded" />
                  </th>
                  <th className="px-2.5 py-2.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    Req ID
                  </th>
                  <th className="px-2.5 py-2.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    Requester
                  </th>
                  <th className="px-2.5 py-2.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-2.5 py-2.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    {view === 'manager' ? 'Assigned Manager' : 'Assigned HR'}
                  </th>
                  <th className="px-2.5 py-2.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-2.5 py-2.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    Aging
                  </th>
                  <th className="px-2.5 py-2.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-2.5 py-2.5 text-center text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500 text-sm">
                      <i className="fa-solid fa-spinner animate-spin mr-2"></i>Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500 text-sm">
                      No pending approvals
                    </td>
                  </tr>
                ) : rows.map((row) => {
                  const aging = agingStyles[row.aging.status]
                  const priority = priorityStyles[row.priority.tone]

                  return (
                    <tr
                      key={row.id}
                      className={`transition-all hover:bg-gray-50 ${aging.row}`}
                    >
                      <td className="px-2.5 py-2 first:rounded-l-xl last:rounded-r-xl relative">
                        <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${aging.accent}`}></span>
                        <input type="checkbox" className="w-4 h-4 text-red-600 rounded" />
                      </td>
                      <td className="px-2.5 py-2 first:rounded-l-xl last:rounded-r-xl">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-gray-800 text-[11px]">{row.id.slice(0, 8)}...</span>
                          {row.aging.status === 'critical' && (
                            <span className="bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full font-semibold">
                              SLA
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{row.date}</div>
                      </td>
                      <td className="px-2.5 py-2 first:rounded-l-xl last:rounded-r-xl">
                        <div className="flex items-center space-x-3">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-semibold text-[10px]">
                            {row.requester.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 text-[11px]">{row.requester.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2.5 py-2 first:rounded-l-xl last:rounded-r-xl">
                        <div className="font-medium text-gray-800 text-[11px]">{row.branch.name}</div>
                      </td>
                      <td className="px-2.5 py-2 first:rounded-l-xl last:rounded-r-xl">
                        <div className="flex items-center space-x-3">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-[10px]">
                            {row.assignedTo.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 text-[11px]">{row.assignedTo.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2.5 py-2 first:rounded-l-xl last:rounded-r-xl">
                        <div className="font-semibold text-gray-800 text-[11px]">{row.items.count} items</div>
                        <div className="text-[10px] text-gray-500">{row.items.units} units</div>
                      </td>
                      <td className="px-2.5 py-2 first:rounded-l-xl last:rounded-r-xl">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${aging.dot}`}></div>
                          <span className={`font-bold text-[11px] ${aging.text}`}>{row.aging.days} days</span>
                        </div>
                        <div className={`text-[10px] font-medium ${aging.subText}`}>{row.aging.label}</div>
                      </td>
                      <td className="px-2.5 py-2 first:rounded-l-xl last:rounded-r-xl">
                        <span className={`${priority} px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center w-fit`}>
                          <i
                            className={`fa-solid mr-1 ${
                              row.priority.tone === 'critical'
                                ? 'fa-exclamation-circle'
                                : row.priority.tone === 'high'
                                  ? 'fa-clock'
                                  : 'fa-info-circle'
                            }`}
                          ></i>
                          {row.priority.label}
                        </span>
                      </td>
                      <td className="px-2.5 py-2 text-right first:rounded-l-xl last:rounded-r-xl">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleApprove(row)}
                            className="px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-[10px] font-semibold transition-all"
                          >
                            <i className="fa-solid fa-check mr-1"></i>Approve
                          </button>
                          <button
                            onClick={() => handleReject(row)}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-[10px] font-semibold transition-all"
                          >
                            <i className="fa-solid fa-times mr-1"></i>Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
