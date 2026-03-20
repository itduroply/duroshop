'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface RequisitionDetail {
  id: string
  requestNo: string
  status: string
  agingDays: number
  requestedDate: string
  reason: string | null
  employee: { name: string; email: string }
  branch: string
  category: string
  items: Array<{ name: string; sku: string; quantity: number }>
}

const statusBadge: Record<string, string> = {
  pending_rm_approval: 'bg-orange-50 text-orange-700',
  pending_hr_approval: 'bg-yellow-50 text-yellow-700',
  pending_for_dispatch: 'bg-amber-50 text-amber-700',
  ready_for_dispatch: 'bg-blue-50 text-blue-700',
  dispatched: 'bg-purple-50 text-purple-700',
  delivered: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
}

const statusLabel: Record<string, string> = {
  pending_rm_approval: 'Pending RM Approval',
  pending_hr_approval: 'Pending HR Approval',
  pending_for_dispatch: 'Pending For Dispatch',
  ready_for_dispatch: 'Ready for Dispatch',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  rejected: 'Rejected',
}

export default function RequisitionDetailPage() {
  const [requisition, setRequisition] = useState<RequisitionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [forceApproveOpen, setForceApproveOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [forceCloseOpen, setForceCloseOpen] = useState(false)
  const [statusValue, setStatusValue] = useState('')
  const [managerValue, setManagerValue] = useState('Sarah Williams (Current)')
  const [approverValue, setApproverValue] = useState('Auto-assign')
  const [expectedDate, setExpectedDate] = useState('2024-01-26')
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchRequisition = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('stock_requests')
          .select(`
            id,
            request_number,
            status,
            reason,
            created_at,
            requester:users!requested_by ( full_name, email ),
            branch:branches!branch_id ( name ),
            category:categories!category_id ( name ),
            items:stock_request_items (
              quantity,
              item:items ( id, name )
            )
          `)
          .eq('id', params.id)
          .single()

        if (error || !data) {
          setNotFound(true)
          return
        }

        const r = data as any
        const days = Math.max(0, Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000))

        setRequisition({
          id: r.id,
          requestNo: r.request_number || r.id.slice(0, 8).toUpperCase(),
          status: r.status,
          agingDays: days,
          requestedDate: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          reason: r.reason || null,
          employee: {
            name: r.requester?.full_name || 'Unknown',
            email: r.requester?.email || '',
          },
          branch: r.branch?.name || '—',
          category: r.category?.name || '—',
          items: (r.items || []).map((i: any) => ({
            name: i.item?.name || 'Unknown Item',
            sku: i.item?.id?.slice(0, 8).toUpperCase() || '—',
            quantity: i.quantity,
          })),
        })
        setStatusValue(r.status)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    fetchRequisition()
  }, [params.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const showSaveToast = () => {
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <i className="fa-solid fa-spinner animate-spin text-gray-400 text-2xl mr-3"></i>
        <span className="text-gray-500">Loading requisition...</span>
      </div>
    )
  }

  if (notFound || !requisition) {
    return (
      <div className="p-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Requisition not found</h1>
          <p className="text-sm text-gray-600 mb-4">The requisition you are looking for does not exist.</p>
          <button
            onClick={() => router.push('/requisitions')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium"
          >
            Back to Requisitions
          </button>
        </div>
      </div>
    )
  }

  const totalQuantity = requisition.items.reduce((acc, item) => acc + item.quantity, 0)
  const badgeClass = statusBadge[requisition.status] || 'bg-gray-50 text-gray-700'
  const statusDisplay = statusLabel[requisition.status] || requisition.status

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <button onClick={() => router.back()} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all">
              <i className="fa-solid fa-arrow-left text-gray-600 text-sm"></i>
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800">{requisition.requestNo}</h1>
              <p className="text-xs text-gray-600">Requisition Detail - Super Admin Override</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${badgeClass}`}>
              <i className="fa-solid fa-clock text-sm"></i>
              <span>{statusDisplay} - {requisition.agingDays}d</span>
            </span>
            <button
              onClick={showSaveToast}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 text-xs"
            >
              <i className="fa-solid fa-save"></i>
              <span>Save</span>
            </button>
          </div>
        </div>

      <div className="grid grid-cols-2 gap-5 p-5">
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center">
                <i className="fa-solid fa-info-circle text-red-600 mr-1.5"></i>
                Request Metadata
              </h2>
              <div className="space-y-3">
                <div className="flex items-start space-x-2 pb-2.5 border-b border-gray-100">
                  <div className="flex-1">
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Requested By</label>
                    <div className="font-semibold text-gray-800 text-sm">{requisition.employee.name}</div>
                    <div className="text-xs text-gray-500">{requisition.employee.email}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Branch</label>
                    <div className="font-medium text-gray-800 text-sm">{requisition.branch}</div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Category</label>
                    <div className="font-medium text-gray-800 text-sm">{requisition.category}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Request Date</label>
                    <div className="font-medium text-gray-800 text-sm">{requisition.requestedDate}</div>
                  </div>
                </div>
                {requisition.reason && (
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Reason / Justification</label>
                    <div className="text-xs text-gray-700 bg-gray-50 rounded-lg p-2">
                      {requisition.reason}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center">
                <i className="fa-solid fa-timeline text-red-600 mr-1.5"></i>
                Approval Timeline
              </h2>
              <div className="space-y-4">
                <div className="relative pl-10">
                  <div className="absolute left-0 top-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <i className="fa-solid fa-check text-green-600 text-xs"></i>
                  </div>
                  <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200"></div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-gray-800 text-sm">Request Submitted</span>
                      <span className="text-[11px] text-gray-500">{requisition.requestedDate}</span>
                    </div>
                    <div className="text-xs text-gray-600">By {requisition.employee.name}</div>
                  </div>
                </div>
                <div className="relative pl-10">
                  <div className="absolute left-0 top-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                    <i className="fa-solid fa-clock text-orange-600 text-xs"></i>
                  </div>
                  <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200"></div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-gray-800 text-sm">Status: {statusDisplay}</span>
                      <span className="text-[11px] text-red-600 font-semibold">{requisition.agingDays} days waiting</span>
                    </div>
                    {requisition.agingDays > 10 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-1.5 text-[11px] text-red-700">
                        <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                        Critical delay - immediate action required
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative pl-10 opacity-40">
                  <div className="absolute left-0 top-0 w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                    <i className="fa-solid fa-user text-gray-500 text-xs"></i>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">Finance Approval</div>
                    <div className="text-xs text-gray-600">Pending previous approval</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center">
                <i className="fa-solid fa-comments text-red-600 mr-1.5"></i>
                Remarks & Conversation
              </h2>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <textarea
                  placeholder="Add a remark..."
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  rows={1}
                ></textarea>
                <button className="mt-1.5 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-medium hover:bg-gray-900 transition-all">
                  <i className="fa-solid fa-paper-plane mr-1"></i>Post
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center">
                <i className="fa-solid fa-table text-red-600 mr-1.5"></i>
                Items & Quantities
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-600 uppercase">Item</th>
                      <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-600 uppercase">Requested</th>
                      <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-600 uppercase">Approved</th>
                      <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-600 uppercase">Dispatched</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {requisition.items.map((item) => (
                      <tr key={item.sku}>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-800 text-sm">{item.name}</div>
                          <div className="text-[11px] text-gray-500">SKU: {item.sku}</div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            value={item.quantity}
                            readOnly
                            className="w-14 px-1.5 py-0.5 border border-gray-300 rounded text-center text-xs font-semibold text-gray-900 bg-white"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            value={0}
                            readOnly
                            className="w-14 px-1.5 py-0.5 border border-green-300 bg-green-50 rounded text-center text-xs font-semibold text-gray-900"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            value={0}
                            readOnly
                            className="w-14 px-1.5 py-0.5 border border-gray-300 rounded text-center text-xs text-gray-900 bg-white"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 pt-3 border border-gray-300 bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-700 font-semibold">Total Items:</span>
                  <span className="font-bold text-gray-900">{requisition.items.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-700 font-semibold">Total Quantity:</span>
                  <span className="font-bold text-gray-900">{totalQuantity} units</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-5">
              <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center">
                <i className="fa-solid fa-user-shield text-red-600 mr-1.5"></i>
                Super Admin Override
                <span className="ml-2 text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded-full">Audited</span>
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Change Status</label>
                  <select
                    value={statusValue}
                    onChange={(e) => setStatusValue(e.target.value)}
                    className="w-full px-3 py-1.5 border-2 border-gray-300 rounded-lg text-xs font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="pending_rm_approval">Pending RM Approval</option>
                    <option value="pending_hr_approval">Pending HR Approval</option>
                    <option value="pending_for_dispatch">Pending For Dispatch</option>
                    <option value="ready_for_dispatch">Ready for Dispatch</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="delivered">Delivered</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Reassign Manager</label>
                  <select
                    value={managerValue}
                    onChange={(e) => setManagerValue(e.target.value)}
                    className="w-full px-3 py-1.5 border-2 border-gray-300 rounded-lg text-xs font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option>Sarah Williams (Current)</option>
                    <option>John Anderson</option>
                    <option>Emma Thompson</option>
                    <option>David Lee</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Reassign HR Approver</label>
                  <select
                    value={approverValue}
                    onChange={(e) => setApproverValue(e.target.value)}
                    className="w-full px-3 py-1.5 border-2 border-gray-300 rounded-lg text-xs font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option>Auto-assign</option>
                    <option>Jennifer Martinez</option>
                    <option>Robert Chen</option>
                    <option>Lisa Johnson</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Edit Expected Date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-1.5 border-2 border-gray-300 rounded-lg text-xs font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="pt-3 border-t-2 border-red-200 space-y-2">
                  <button
                    onClick={() => setForceApproveOpen(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-semibold transition-all flex items-center justify-center space-x-1.5 text-xs"
                  >
                    <i className="fa-solid fa-bolt text-sm"></i>
                    <span>Force Approve</span>
                  </button>

                  <button
                    onClick={() => setCancelOpen(true)}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg font-semibold transition-all flex items-center justify-center space-x-1.5 text-xs"
                  >
                    <i className="fa-solid fa-ban text-sm"></i>
                    <span>Cancel Request</span>
                  </button>

                  <button
                    onClick={() => setForceCloseOpen(true)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-semibold transition-all flex items-center justify-center space-x-1.5 text-xs"
                  >
                    <i className="fa-solid fa-xmark-circle text-sm"></i>
                    <span>Force Close</span>
                  </button>
                </div>

                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-2 text-[11px] text-yellow-800">
                  <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                  <strong>Warning:</strong> All override actions are logged and audited.
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center">
                <i className="fa-solid fa-bolt text-yellow-600 mr-1.5"></i>
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center justify-center space-x-1 text-xs">
                  <i className="fa-solid fa-envelope text-sm"></i>
                  <span>Send Reminder</span>
                </button>
                <button className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all flex items-center justify-center space-x-1 text-xs">
                  <i className="fa-solid fa-clock text-sm"></i>
                  <span>Escalate</span>
                </button>
                <button className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all flex items-center justify-center space-x-1 text-xs">
                  <i className="fa-solid fa-copy text-sm"></i>
                  <span>Duplicate</span>
                </button>
                <button className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all flex items-center justify-center space-x-1 text-xs">
                  <i className="fa-solid fa-download text-sm"></i>
                  <span>Export PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      {showToast && (
        <div className="fixed top-16 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center space-x-2 z-[100]">
          <i className="fa-solid fa-check-circle text-lg"></i>
          <div>
            <div className="font-semibold text-sm">Changes Saved</div>
            <div className="text-xs text-green-100">All modifications logged</div>
          </div>
        </div>
      )}

      {forceApproveOpen && (
        <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4">
            <div className="px-5 py-3 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-800 flex items-center">
                <i className="fa-solid fa-triangle-exclamation text-yellow-600 mr-2"></i>
                Force Approve
              </h3>
            </div>
            <div className="px-5 py-4">
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-3">
                <p className="text-xs text-yellow-800 mb-1.5">
                  <strong>Warning:</strong> This will bypass all remaining approvals immediately.
                </p>
                <p className="text-xs text-yellow-800">
                  This action will be logged in the audit trail.
                </p>
              </div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Justification (Required)</label>
              <textarea
                placeholder="Enter reason..."
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows={2}
              ></textarea>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-2">
              <button
                onClick={() => setForceApproveOpen(false)}
                className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-all text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => { setForceApproveOpen(false); showSaveToast() }}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all text-xs"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelOpen && (
        <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4">
            <div className="px-5 py-3 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-800 flex items-center">
                <i className="fa-solid fa-ban text-orange-600 mr-2"></i>
                Cancel Request
              </h3>
            </div>
            <div className="px-5 py-4">
              <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 mb-3">
                <p className="text-xs text-orange-800 mb-1.5">
                  <strong>Caution:</strong> Cancelling will notify all approvers.
                </p>
                <p className="text-xs text-orange-800">
                  This action cannot be undone.
                </p>
              </div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Cancellation Reason (Required)</label>
              <textarea
                placeholder="Enter reason..."
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows={2}
              ></textarea>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-2">
              <button
                onClick={() => setCancelOpen(false)}
                className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-all text-xs"
              >
                Go Back
              </button>
              <button
                onClick={() => { setCancelOpen(false); showSaveToast() }}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-all text-xs"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {forceCloseOpen && (
        <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4">
            <div className="px-5 py-3 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-800 flex items-center">
                <i className="fa-solid fa-xmark-circle text-red-600 mr-2"></i>
                Force Close Request
              </h3>
            </div>
            <div className="px-5 py-4">
              <div className="bg-red-50 border border-red-300 rounded-lg p-3 mb-3">
                <p className="text-xs text-red-800 mb-1.5">
                  <strong>Critical:</strong> This will permanently terminate the requisition.
                </p>
                <p className="text-xs text-red-800">
                  This is irreversible and requires audit justification.
                </p>
              </div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Audit Justification (Mandatory)</label>
              <textarea
                placeholder="Provide justification..."
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows={2}
              ></textarea>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end space-x-2">
              <button
                onClick={() => setForceCloseOpen(false)}
                className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-all text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => { setForceCloseOpen(false); showSaveToast() }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all text-xs"
              >
                Force Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
