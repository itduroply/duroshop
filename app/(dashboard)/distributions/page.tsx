"use client"

import { useState, useEffect, useCallback } from 'react'
import { User } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useBranchFilter } from '@/hooks/use-branch-filter'

interface ReceiverType {
  id: string
  name: string
}

interface Receiver {
  id: string
  name: string
  phone: string | null
  receiver_type_id: string
  branch_id: string
  address: string | null
  receiver_type?: { name: string }
}

interface BranchStockItem {
  item_id: string
  item_name: string
  item_unit: string
  available: number
}

interface DistributionItemRow {
  item_id: string
  item_name: string
  item_unit: string
  quantity: number
  available: number
}

interface DistributionRow {
  id: string
  created_at: string
  status: string
  remarks: string | null
  branch: { name: string }
  receiver: { name: string; phone: string | null }
  receiver_type: { name: string }
  issued_by_user: { full_name: string } | null
  issued_at: string | null
  items: { item_name: string; quantity: number; item_unit: string }[]
  total_items: number
  total_qty: number
}

const statusMap: Record<string, string> = {
  pending: 'Pending Approval',
  manager_approved: 'Manager Approved',
  hr_approved: 'HR Approved',
  issued: 'Issued',
  rejected: 'Rejected',
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  manager_approved: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  hr_approved: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  issued: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
}

export default function DistributionsPage() {
  const supabase = createClient()
  const { selectedBranchId } = useBranchFilter()
  const [user, setUser] = useState<User | null>(null)
  const [userBranchId, setUserBranchId] = useState<string | null>(null)
  const [roleName, setRoleName] = useState('')
  const [distributions, setDistributions] = useState<DistributionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // New distribution form state
  const [showForm, setShowForm] = useState(false)
  const [receiverTypes, setReceiverTypes] = useState<ReceiverType[]>([])
  const [receivers, setReceivers] = useState<Receiver[]>([])
  const [branchStock, setBranchStock] = useState<BranchStockItem[]>([])
  const [selectedReceiverTypeId, setSelectedReceiverTypeId] = useState('')
  const [selectedReceiverId, setSelectedReceiverId] = useState('')
  const [remarks, setRemarks] = useState('')
  const [formItems, setFormItems] = useState<DistributionItemRow[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Detail drawer
  const [selectedDist, setSelectedDist] = useState<DistributionRow | null>(null)

  const fetchUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    const { data: profile } = await supabase
      .from('users')
      .select('id, full_name, email, phone, role_id, branch_id, reporting_manager, is_active, created_at, roles:role_id ( name )')
      .eq('id', authUser.id)
      .single()
    if (profile) {
      setRoleName((profile.roles as any)?.name || '')
      setUserBranchId(profile.branch_id)
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
  }, [supabase])

  const fetchDistributions = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('distributions')
      .select(`
        id, created_at, status, remarks, issued_at,
        branch:branches!branch_id ( name ),
        receiver:receivers!receiver_id ( name, phone ),
        receiver_type:receiver_types!receiver_type_id ( name ),
        issued_by_user:users!issued_by ( full_name ),
        distribution_items ( quantity, item:items!item_id ( name, unit ) )
      `)
      .order('created_at', { ascending: false })

    if (selectedBranchId) {
      query = query.eq('branch_id', selectedBranchId)
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data } = await query

    const mapped: DistributionRow[] = (data || []).map((d: any) => {
      const items = (d.distribution_items || []).map((di: any) => ({
        item_name: di.item?.name || 'Unknown',
        quantity: di.quantity,
        item_unit: di.item?.unit || 'pcs',
      }))
      return {
        id: d.id,
        created_at: d.created_at,
        status: d.status,
        remarks: d.remarks,
        branch: { name: d.branch?.name || '—' },
        receiver: { name: d.receiver?.name || '—', phone: d.receiver?.phone || null },
        receiver_type: { name: d.receiver_type?.name || '—' },
        issued_by_user: d.issued_by_user ? { full_name: d.issued_by_user.full_name } : null,
        issued_at: d.issued_at,
        items,
        total_items: items.length,
        total_qty: items.reduce((s: number, i: any) => s + i.quantity, 0),
      }
    })
    setDistributions(mapped)
    setLoading(false)
  }, [supabase, selectedBranchId, statusFilter])

  const fetchFormData = useCallback(async () => {
    const branchId = userBranchId
    if (!branchId) return

    const [rtRes, rcRes, bsRes] = await Promise.all([
      supabase.from('receiver_types').select('id, name').order('name'),
      supabase.from('receivers').select('id, name, phone, receiver_type_id, branch_id, address, receiver_type:receiver_types!receiver_type_id ( name )').eq('branch_id', branchId),
      supabase.from('branch_stock').select('item_id, quantity, item:items!item_id ( name, unit )').eq('branch_id', branchId).gt('quantity', 0),
    ])

    setReceiverTypes(rtRes.data || [])
    setReceivers((rcRes.data || []) as any)
    setBranchStock((bsRes.data || []).map((bs: any) => ({
      item_id: bs.item_id,
      item_name: bs.item?.name || 'Unknown',
      item_unit: bs.item?.unit || 'pcs',
      available: bs.quantity,
    })))
  }, [supabase, userBranchId])

  useEffect(() => { fetchUser() }, [fetchUser])
  useEffect(() => { fetchDistributions() }, [fetchDistributions])
  useEffect(() => { if (userBranchId) fetchFormData() }, [fetchFormData, userBranchId])

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  const filteredReceivers = selectedReceiverTypeId
    ? receivers.filter(r => r.receiver_type_id === selectedReceiverTypeId)
    : receivers

  const addItem = () => {
    setFormItems(prev => [...prev, { item_id: '', item_name: '', item_unit: '', quantity: 1, available: 0 }])
  }

  const removeItem = (idx: number) => {
    setFormItems(prev => prev.filter((_, i) => i !== idx))
  }

  const updateItem = (idx: number, field: string, value: any) => {
    setFormItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      if (field === 'item_id') {
        const stock = branchStock.find(s => s.item_id === value)
        return { ...item, item_id: value, item_name: stock?.item_name || '', item_unit: stock?.item_unit || '', available: stock?.available || 0, quantity: 1 }
      }
      if (field === 'quantity') {
        return { ...item, quantity: Math.max(1, Math.min(Number(value), item.available)) }
      }
      return item
    }))
  }

  const resetForm = () => {
    setSelectedReceiverTypeId('')
    setSelectedReceiverId('')
    setRemarks('')
    setFormItems([])
    setShowForm(false)
  }

  const handleSubmit = async () => {
    if (!selectedReceiverId || formItems.length === 0) {
      setToast({ type: 'error', message: 'Please select a receiver and add at least one item.' })
      return
    }
    const invalidItems = formItems.filter(fi => !fi.item_id || fi.quantity <= 0)
    if (invalidItems.length > 0) {
      setToast({ type: 'error', message: 'Please select an item and valid quantity for each row.' })
      return
    }
    // Check for duplicate items
    const itemIds = formItems.map(fi => fi.item_id)
    if (new Set(itemIds).size !== itemIds.length) {
      setToast({ type: 'error', message: 'Duplicate items found. Please select unique items.' })
      return
    }

    setSubmitting(true)
    const receiver = receivers.find(r => r.id === selectedReceiverId)

    const { data: dist, error: distErr } = await supabase
      .from('distributions')
      .insert({
        branch_id: userBranchId,
        receiver_id: selectedReceiverId,
        receiver_type_id: receiver?.receiver_type_id || selectedReceiverTypeId,
        status: 'pending',
        remarks: remarks || null,
      })
      .select('id')
      .single()

    if (distErr || !dist) {
      setToast({ type: 'error', message: 'Failed to create distribution: ' + (distErr?.message || 'Unknown error') })
      setSubmitting(false)
      return
    }

    const { error: itemsErr } = await supabase
      .from('distribution_items')
      .insert(formItems.map(fi => ({
        distribution_id: dist.id,
        item_id: fi.item_id,
        quantity: fi.quantity,
      })))

    if (itemsErr) {
      setToast({ type: 'error', message: 'Distribution created but failed to add items: ' + itemsErr.message })
    } else {
      setToast({ type: 'success', message: 'Distribution created successfully!' })
    }

    resetForm()
    fetchDistributions()
    setSubmitting(false)
  }

  // Summary counts
  const totalDist = distributions.length
  const pendingCount = distributions.filter(d => d.status === 'pending').length
  const issuedCount = distributions.filter(d => d.status === 'issued').length
  const totalQtyIssued = distributions.filter(d => d.status === 'issued').reduce((s, d) => s + d.total_qty, 0)

  const filtered = distributions.filter(d => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      if (!d.receiver.name.toLowerCase().includes(q) &&
          !d.branch.name.toLowerCase().includes(q) &&
          !d.receiver_type.name.toLowerCase().includes(q) &&
          !d.id.toLowerCase().includes(q)) return false
    }
    return true
  })

  const canCreate = roleName === 'Super Admin' || roleName === 'Manager' || roleName === 'Employee'

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-right ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-2 sticky top-0 z-40 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div>
            <h1 className="text-lg font-bold text-gray-800">POP Distributions</h1>
            <p className="text-[11px] text-gray-600">Distribute POP items to receivers from your branch stock</p>
          </div>
          {canCreate && (
            <button
              onClick={() => { setShowForm(true); addItem() }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-xs transition-all shadow-sm"
            >
              <i className="fa-solid fa-plus"></i>
              New Distribution
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Total</div>
            <div className="text-lg font-bold text-gray-800">{totalDist}</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
            <div className="text-[10px] text-orange-600 uppercase font-semibold">Pending</div>
            <div className="text-lg font-bold text-orange-700">{pendingCount}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2">
            <div className="text-[10px] text-green-600 uppercase font-semibold">Issued</div>
            <div className="text-lg font-bold text-green-700">{issuedCount}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
            <div className="text-[10px] text-blue-600 uppercase font-semibold">Qty Issued</div>
            <div className="text-lg font-bold text-blue-700">{totalQtyIssued}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <i className="fa-solid fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px]"></i>
            <input
              type="text"
              placeholder="Search receiver, branch..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="manager_approved">Manager Approved</option>
            <option value="hr_approved">HR Approved</option>
            <option value="issued">Issued</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* New Distribution Form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-box-open"></i>
                <span className="font-semibold text-sm">New Distribution</span>
              </div>
              <button onClick={resetForm} className="text-white/80 hover:text-white transition-colors">
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Receiver Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase">Receiver Type</label>
                  <select
                    value={selectedReceiverTypeId}
                    onChange={e => { setSelectedReceiverTypeId(e.target.value); setSelectedReceiverId('') }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">All Types</option>
                    {receiverTypes.map(rt => (
                      <option key={rt.id} value={rt.id}>{rt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase">Receiver (Person)</label>
                  <select
                    value={selectedReceiverId}
                    onChange={e => setSelectedReceiverId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select Receiver</option>
                    {filteredReceivers.map(r => (
                      <option key={r.id} value={r.id}>{r.name}{r.phone ? ` (${r.phone})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1 uppercase">Remarks</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Optional notes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold text-gray-600 uppercase">Items to Distribute</label>
                  <button onClick={addItem} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium">
                    <i className="fa-solid fa-plus text-[10px]"></i> Add Item
                  </button>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-600 uppercase">#</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-600 uppercase">POP Item</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-600 uppercase">Available</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-600 uppercase">Quantity</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-600 uppercase">Unit</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-600 uppercase w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-gray-400 text-xs">
                            No items added yet. Click &quot;Add Item&quot; above.
                          </td>
                        </tr>
                      ) : formItems.map((fi, idx) => {
                        // Items already selected in other rows
                        const usedIds = formItems.filter((_, i) => i !== idx).map(f => f.item_id)
                        const availableItems = branchStock.filter(s => !usedIds.includes(s.item_id))
                        return (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50/50">
                            <td className="px-3 py-2 text-xs text-gray-500 font-medium">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <select
                                value={fi.item_id}
                                onChange={e => updateItem(idx, 'item_id', e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                              >
                                <option value="">Select Item</option>
                                {availableItems.map(s => (
                                  <option key={s.item_id} value={s.item_id}>{s.item_name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-xs font-semibold ${fi.available > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                {fi.item_id ? fi.available : '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                min={1}
                                max={fi.available}
                                value={fi.quantity}
                                onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                disabled={!fi.item_id}
                                className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-center focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100"
                              />
                            </td>
                            <td className="px-3 py-2 text-center text-xs text-gray-500">{fi.item_unit || '—'}</td>
                            <td className="px-3 py-2 text-center">
                              <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 transition-colors">
                                <i className="fa-solid fa-trash-can text-[11px]"></i>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {formItems.length > 0 && (
                  <div className="flex items-center justify-between mt-2 px-1">
                    <span className="text-[11px] text-gray-500">
                      {formItems.filter(fi => fi.item_id).length} item(s) · {formItems.reduce((s, fi) => s + fi.quantity, 0)} total qty
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button onClick={resetForm} className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !selectedReceiverId || formItems.length === 0}
                  className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {submitting ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
                  {submitting ? 'Submitting...' : 'Create Distribution'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Distribution List */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Receiver</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Type</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Branch</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-600 uppercase tracking-wider">Items</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-600 uppercase tracking-wider">Total Qty</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-600 uppercase tracking-wider">Remarks</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-500 text-sm">
                      <i className="fa-solid fa-spinner animate-spin mr-2"></i>Loading distributions...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">
                      <i className="fa-solid fa-box-open text-2xl mb-2 block text-gray-300"></i>
                      No distributions found
                    </td>
                  </tr>
                ) : filtered.map(d => {
                  const st = statusColors[d.status] || statusColors.pending
                  return (
                    <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelectedDist(d)}>
                      <td className="px-3 py-2.5">
                        <div className="text-xs font-medium text-gray-800">
                          {new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {new Date(d.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-semibold text-[10px]">
                            {d.receiver.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-800">{d.receiver.name}</div>
                            {d.receiver.phone && <div className="text-[10px] text-gray-500">{d.receiver.phone}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{d.receiver_type.name}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-700">{d.branch.name}</td>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold text-gray-800">{d.total_items}</td>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold text-gray-800">{d.total_qty}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${st.bg} ${st.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                          {statusMap[d.status] || d.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[120px] truncate">{d.remarks || '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedDist(d) }}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <i className="fa-solid fa-eye text-xs"></i>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedDist && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedDist(null)}></div>
          <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right">
            <div className="px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white flex items-center justify-between sticky top-0 z-10">
              <div>
                <div className="font-semibold text-sm">Distribution Details</div>
                <div className="text-[10px] text-white/80">{selectedDist.id.slice(0, 8)}...</div>
              </div>
              <button onClick={() => setSelectedDist(null)} className="text-white/80 hover:text-white">
                <i className="fa-solid fa-times text-lg"></i>
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                {(() => { const st = statusColors[selectedDist.status] || statusColors.pending; return (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${st.bg} ${st.text}`}>
                    <span className={`w-2 h-2 rounded-full ${st.dot}`}></span>
                    {statusMap[selectedDist.status] || selectedDist.status}
                  </span>
                )})()}
              </div>

              {/* Info */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-semibold">Receiver</div>
                    <div className="text-sm font-medium text-gray-800">{selectedDist.receiver.name}</div>
                    {selectedDist.receiver.phone && <div className="text-xs text-gray-500">{selectedDist.receiver.phone}</div>}
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-semibold">Receiver Type</div>
                    <div className="text-sm font-medium text-gray-800">{selectedDist.receiver_type.name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-semibold">Branch</div>
                    <div className="text-sm font-medium text-gray-800">{selectedDist.branch.name}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-semibold">Created</div>
                    <div className="text-sm font-medium text-gray-800">
                      {new Date(selectedDist.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                {selectedDist.remarks && (
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-semibold">Remarks</div>
                    <div className="text-sm text-gray-700">{selectedDist.remarks}</div>
                  </div>
                )}
                {selectedDist.issued_by_user && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase font-semibold">Issued By</div>
                      <div className="text-sm text-gray-800">{selectedDist.issued_by_user.full_name}</div>
                    </div>
                    {selectedDist.issued_at && (
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase font-semibold">Issued At</div>
                        <div className="text-sm text-gray-800">
                          {new Date(selectedDist.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <div className="text-[10px] text-gray-500 uppercase font-semibold mb-2">Items ({selectedDist.total_items})</div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-600 uppercase">Item</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-600 uppercase">Qty</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-600 uppercase">Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDist.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="px-3 py-2 text-xs text-gray-800">{item.item_name}</td>
                          <td className="px-3 py-2 text-center text-xs font-semibold text-gray-800">{item.quantity}</td>
                          <td className="px-3 py-2 text-center text-xs text-gray-500">{item.item_unit}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td className="px-3 py-2 text-xs font-bold text-gray-700">Total</td>
                        <td className="px-3 py-2 text-center text-xs font-bold text-gray-800">{selectedDist.total_qty}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
