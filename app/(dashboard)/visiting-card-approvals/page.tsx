"use client"

import { useState, useEffect, useCallback } from 'react'
import { User } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface ApprovalRequest {
  id: string
  reason: string
  quantity: number
  status: string
  created_at: string
  requester: {
    full_name: string
    email: string | null
    phone: string | null
    roles: { name: string } | null
    branches: { name: string } | null
  } | null
  reporting_manager: { full_name: string } | null
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending_rm_approval: { label: 'Pending Manager', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: 'fa-clock' },
  pending_hr_approval: { label: 'Pending HR', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: 'fa-hourglass-half' },
  approved: { label: 'Approved', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: 'fa-check-circle' },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: 'fa-times-circle' },
}

export default function VisitingCardApprovalsPage() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [roleName, setRoleName] = useState('')
  const [view, setView] = useState<'manager' | 'hr'>('manager')
  const [managerRows, setManagerRows] = useState<ApprovalRequest[]>([])
  const [hrRows, setHrRows] = useState<ApprovalRequest[]>([])
  const [allRows, setAllRows] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)

  const showManagerTab = roleName === 'Super Admin' || roleName === 'Manager'
  const showHrTab = roleName === 'Super Admin' || roleName === 'HR'

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { setLoading(false); return }

    const { data: profile } = await supabase
      .from('users')
      .select('id, full_name, email, phone, role_id, branch_id, reporting_manager, is_active, created_at, roles:role_id ( name )')
      .eq('id', authUser.id)
      .single()

    if (profile) {
      const userRoleName = (profile.roles as any)?.name || ''
      setRoleName(userRoleName)
      if (userRoleName === 'HR') setView('hr')
      else setView('manager')
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

    const selectQuery = `
      id,
      reason,
      quantity,
      status,
      created_at,
      requester:users!requested_by ( full_name, email, phone, roles:role_id ( name ), branches:branch_id ( name ) ),
      reporting_manager:users!reporting_manager_id ( full_name )
    `

    // Pending RM approval – manager sees requests where they are the reporting manager
    const { data: rmData } = await supabase
      .from('visiting_card_requests')
      .select(selectQuery)
      .eq('status', 'pending_rm_approval')
      .order('created_at', { ascending: false })

    // Pending HR approval
    const { data: hrData } = await supabase
      .from('visiting_card_requests')
      .select(selectQuery)
      .eq('status', 'pending_hr_approval')
      .order('created_at', { ascending: false })

    // All requests for Super Admin
    const { data: all } = await supabase
      .from('visiting_card_requests')
      .select(selectQuery)
      .order('created_at', { ascending: false })

    // For managers, filter to only requests where they are the reporting manager
    const currentRoleName = (profile as any)?.roles?.name || ''
    if (currentRoleName === 'Manager') {
      setManagerRows(((rmData || []) as unknown as ApprovalRequest[]).filter(
        r => r.reporting_manager?.full_name === profile?.full_name
      ))
    } else {
      setManagerRows((rmData || []) as unknown as ApprovalRequest[])
    }

    setHrRows((hrData || []) as unknown as ApprovalRequest[])
    setAllRows((all || []) as unknown as ApprovalRequest[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const handleApprove = async (req: ApprovalRequest) => {
    if (req.status === 'pending_rm_approval') {
      await supabase
        .from('visiting_card_requests')
        .update({
          status: 'pending_hr_approval',
          rm_approved_by: user?.id,
          rm_approved_at: new Date().toISOString(),
        })
        .eq('id', req.id)
    } else if (req.status === 'pending_hr_approval') {
      await supabase
        .from('visiting_card_requests')
        .update({
          status: 'approved',
          hr_approved_by: user?.id,
          hr_approved_at: new Date().toISOString(),
        })
        .eq('id', req.id)
    }
    fetchData()
  }

  const handleReject = async (req: ApprovalRequest) => {
    await supabase
      .from('visiting_card_requests')
      .update({
        status: 'rejected',
        rejected_by: user?.id,
        rejected_at: new Date().toISOString(),
      })
      .eq('id', req.id)
    fetchData()
  }

  const rows = view === 'manager' ? managerRows : hrRows

  return (
    <>
      <div className="bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-1.5 sticky top-0 z-40 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-0.5">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Visiting Card Approvals</h1>
            <p className="text-[11px] text-gray-600 mt-0">
              Review and approve visiting card requests
            </p>
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
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${
                  view === 'manager' ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
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
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${
                  view === 'hr' ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {hrRows.length}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total', value: allRows.length, icon: 'fa-id-card', color: 'text-gray-700', bg: 'bg-gray-50' },
            { label: 'Pending RM', value: allRows.filter(r => r.status === 'pending_rm_approval').length, icon: 'fa-user-tie', color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Pending HR', value: allRows.filter(r => r.status === 'pending_hr_approval').length, icon: 'fa-users', color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Approved', value: allRows.filter(r => r.status === 'approved').length, icon: 'fa-check-circle', color: 'text-green-600', bg: 'bg-green-50' },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-lg border border-gray-200 p-3`}>
              <div className="flex items-center space-x-2">
                <i className={`fa-solid ${stat.icon} ${stat.color}`}></i>
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <p className={`text-xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">S.No.</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Name</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Designation</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Location</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Official Phone</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Official Email</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">QTY.</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Branch</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Status</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Date</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">
                  <i className="fa-solid fa-inbox text-3xl mb-2 block"></i>
                  No pending requests
                </td></tr>
              ) : rows.map((req, i) => {
                const st = statusConfig[req.status] || statusConfig.pending_rm_approval
                const canApprove = (view === 'manager' && req.status === 'pending_rm_approval') ||
                                   (view === 'hr' && req.status === 'pending_hr_approval')
                return (
                  <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2.5 text-gray-700 font-medium whitespace-nowrap">{req.requester?.full_name || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{req.requester?.roles?.name || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{req.requester?.branches?.name || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{req.requester?.phone || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{req.requester?.email || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-700 text-center">{req.quantity ?? 1}</td>
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{req.requester?.branches?.name || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.bg} ${st.color} whitespace-nowrap`}>
                        <i className={`fa-solid ${st.icon}`}></i>
                        <span>{st.label}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                      {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-2.5">
                      {canApprove ? (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleApprove(req)}
                            className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-medium transition-colors"
                          >
                            <i className="fa-solid fa-check mr-1"></i>Approve
                          </button>
                          <button
                            onClick={() => handleReject(req)}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-medium transition-colors"
                          >
                            <i className="fa-solid fa-xmark mr-1"></i>Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
