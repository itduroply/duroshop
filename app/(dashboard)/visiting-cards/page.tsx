"use client"

import { useState, useEffect, useCallback } from 'react'
import { User } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface VisitingCardRequest {
  id: string
  reason: string
  quantity: number
  status: string
  created_at: string
  rm_approved_at: string | null
  hr_approved_at: string | null
  rejected_at: string | null
  reporting_manager: { full_name: string } | null
  rm_approver: { full_name: string } | null
  hr_approver: { full_name: string } | null
  rejected_by_user: { full_name: string } | null
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending_rm_approval: { label: 'Pending Manager Approval', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: 'fa-clock' },
  pending_hr_approval: { label: 'Pending HR Approval', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: 'fa-hourglass-half' },
  approved: { label: 'Approved', color: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: 'fa-check-circle' },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: 'fa-times-circle' },
}

export default function VisitingCardsPage() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [requests, setRequests] = useState<VisitingCardRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [reason, setReason] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [submitting, setSubmitting] = useState(false)

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

    const { data: reqs } = await supabase
      .from('visiting_card_requests')
      .select(`
        id,
        reason,
        quantity,
        status,
        created_at,
        rm_approved_at,
        hr_approved_at,
        rejected_at,
        reporting_manager:users!reporting_manager_id ( full_name ),
        rm_approver:users!rm_approved_by ( full_name ),
        hr_approver:users!hr_approved_by ( full_name ),
        rejected_by_user:users!rejected_by ( full_name )
      `)
      .eq('requested_by', authUser.id)
      .order('created_at', { ascending: false })

    setRequests((reqs || []) as unknown as VisitingCardRequest[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSubmit = async () => {
    if (!reason.trim() || !user) return
    setSubmitting(true)

    await supabase.from('visiting_card_requests').insert({
      requested_by: user.id,
      reason: reason.trim(),
      quantity,
      status: 'pending_rm_approval',
      reporting_manager_id: user.reporting_manager || null,
    })

    setReason('')
    setQuantity(1)
    setShowModal(false)
    setSubmitting(false)
    fetchData()
  }

  return (
    <>
      <div className="bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-1.5 sticky top-0 z-40 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-0.5">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Visiting Cards</h1>
            <p className="text-[11px] text-gray-600 mt-0">
              Apply for visiting cards and track your request status
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium text-xs transition-all"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Apply Visiting Card</span>
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total Requests', value: requests.length, icon: 'fa-id-card', color: 'text-gray-700', bg: 'bg-gray-50' },
            { label: 'Pending', value: requests.filter(r => r.status.startsWith('pending')).length, icon: 'fa-clock', color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Approved', value: requests.filter(r => r.status === 'approved').length, icon: 'fa-check-circle', color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Rejected', value: requests.filter(r => r.status === 'rejected').length, icon: 'fa-times-circle', color: 'text-red-600', bg: 'bg-red-50' },
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

        {/* Request Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">#</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Date</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Reason</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">QTY.</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Reporting Manager</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Approved By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  <i className="fa-solid fa-id-card text-3xl mb-2 block"></i>
                  No visiting card requests yet. Click &quot;Apply Visiting Card&quot; to get started.
                </td></tr>
              ) : requests.map((req, i) => {
                const st = statusConfig[req.status] || statusConfig.pending_rm_approval
                return (
                  <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2.5 text-gray-700">
                      {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 max-w-xs truncate">{req.reason}</td>
                    <td className="px-4 py-2.5 text-gray-700 text-center">{req.quantity ?? 1}</td>
                    <td className="px-4 py-2.5 text-gray-700">{req.reporting_manager?.full_name || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.bg} ${st.color}`}>
                        <i className={`fa-solid ${st.icon}`}></i>
                        <span>{st.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 text-[11px]">
                      {req.status === 'approved' && (
                        <div>
                          {req.rm_approver?.full_name && <div>RM: {req.rm_approver.full_name}</div>}
                          {req.hr_approver?.full_name && <div>HR: {req.hr_approver.full_name}</div>}
                        </div>
                      )}
                      {req.status === 'rejected' && req.rejected_by_user?.full_name && (
                        <span className="text-red-600">{req.rejected_by_user.full_name}</span>
                      )}
                      {req.status.startsWith('pending') && <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-red-600 px-5 py-3 flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm">Apply for Visiting Card</h2>
              <button onClick={() => { setShowModal(false); setReason(''); setQuantity(1) }} className="text-white/80 hover:text-white">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason for Visiting Card</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                  placeholder="Enter the reason for requesting a visiting card..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                />
              </div>
              {user?.reporting_manager ? (
                <p className="text-[11px] text-gray-500">
                  <i className="fa-solid fa-info-circle mr-1"></i>
                  Your request will be sent to your reporting manager for approval first, then to HR.
                </p>
              ) : (
                <p className="text-[11px] text-orange-600">
                  <i className="fa-solid fa-exclamation-triangle mr-1"></i>
                  No reporting manager assigned. The request will still be created.
                </p>
              )}
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
              <button
                onClick={() => { setShowModal(false); setReason(''); setQuantity(1) }}
                className="px-4 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason.trim() || submitting}
                className="px-4 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
