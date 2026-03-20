"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBranchFilter } from '@/hooks/use-branch-filter'

interface Receiver {
  id: string
  name: string
  phone: string | null
  address: string | null
  created_at: string
  receiver_type: { name: string } | null
  branch: { name: string } | null
}

interface ReceiverType {
  id: string
  name: string
}

export default function ReceiversPage() {
  const supabase = createClient()
  const { selectedBranchId, branches } = useBranchFilter()
  const [receivers, setReceivers] = useState<Receiver[]>([])
  const [receiverTypes, setReceiverTypes] = useState<ReceiverType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Receiver | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '', receiver_type_id: '', branch_id: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)

    const [typesRes, receiversRes] = await Promise.all([
      supabase.from('receiver_types').select('id, name').order('name'),
      (() => {
        let q = supabase.from('receivers').select(`
          id, name, phone, address, created_at,
          receiver_type:receiver_types!receiver_type_id ( name ),
          branch:branches!branch_id ( name )
        `).order('created_at', { ascending: false })
        if (selectedBranchId) q = q.eq('branch_id', selectedBranchId)
        return q
      })(),
    ])

    setReceiverTypes((typesRes.data || []) as ReceiverType[])
    setReceivers((receiversRes.data || []) as unknown as Receiver[])
    setLoading(false)
  }, [supabase, selectedBranchId])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = receivers.filter(r => {
    const matchesSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.phone?.includes(search) || r.address?.toLowerCase().includes(search.toLowerCase())
    const matchesType = !filterType || r.receiver_type?.name === filterType
    return matchesSearch && matchesType
  })

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', phone: '', address: '', receiver_type_id: '', branch_id: '' })
    setShowModal(true)
  }

  const openEdit = (r: Receiver) => {
    setEditing(r)
    const typeMatch = receiverTypes.find(t => t.name === r.receiver_type?.name)
    const branchMatch = branches.find(b => b.name === r.branch?.name)
    setForm({
      name: r.name,
      phone: r.phone || '',
      address: r.address || '',
      receiver_type_id: typeMatch?.id || '',
      branch_id: branchMatch?.id || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    setSubmitting(true)

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      receiver_type_id: form.receiver_type_id || null,
      branch_id: form.branch_id || null,
    }

    if (editing) {
      await supabase.from('receivers').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('receivers').insert(payload)
    }

    setShowModal(false)
    setSubmitting(false)
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this receiver?')) return
    await supabase.from('receivers').delete().eq('id', id)
    fetchData()
  }

  const typeCounts = receiverTypes.reduce<Record<string, number>>((acc, t) => {
    acc[t.name] = receivers.filter(r => r.receiver_type?.name === t.name).length
    return acc
  }, {})

  const typeIcons: Record<string, string> = {
    Employee: 'fa-user-tie',
    Architect: 'fa-drafting-compass',
    Dealer: 'fa-handshake',
    Contractor: 'fa-hard-hat',
  }

  return (
    <>
      {/* Header */}
      <div className="bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-1.5 sticky top-0 z-40 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-0.5">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Receivers</h1>
            <p className="text-[11px] text-gray-600 mt-0">
              Manage receiver records (employees, architects, dealers, contractors)
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center space-x-2 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium text-xs transition-all"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Add Receiver</span>
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
            <div className="flex items-center space-x-2">
              <i className="fa-solid fa-users text-gray-700"></i>
              <span className="text-xs text-gray-500">Total</span>
            </div>
            <p className="text-xl font-bold text-gray-700 mt-1">{receivers.length}</p>
          </div>
          {receiverTypes.map(t => (
            <div key={t.id} className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <div className="flex items-center space-x-2">
                <i className={`fa-solid ${typeIcons[t.name] || 'fa-user'} text-red-600`}></i>
                <span className="text-xs text-gray-500">{t.name}s</span>
              </div>
              <p className="text-xl font-bold text-gray-700 mt-1">{typeCounts[t.name] || 0}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 max-w-xs">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              type="text"
              placeholder="Search receivers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          >
            <option value="">All Types</option>
            {receiverTypes.map(t => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">#</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Phone</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Branch</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Address</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Added</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  <i className="fa-solid fa-user-slash text-3xl mb-2 block"></i>
                  {receivers.length === 0
                    ? 'No receivers found. Add your first receiver to get started.'
                    : 'No receivers match your search.'}
                </td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-2.5 text-gray-700 font-medium">{r.name}</td>
                  <td className="px-4 py-2.5">
                    {r.receiver_type ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-red-50 border-red-200 text-red-700">
                        <i className={`fa-solid ${typeIcons[r.receiver_type.name] || 'fa-user'}`}></i>
                        <span>{r.receiver_type.name}</span>
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{r.phone || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-700">{r.branch?.name || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-700 max-w-xs truncate">{r.address || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-700">
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center space-x-1">
                      <button onClick={() => openEdit(r)} className="p-1 text-gray-500 hover:text-blue-600 transition-colors" title="Edit">
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="p-1 text-gray-500 hover:text-red-600 transition-colors" title="Delete">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-red-600 px-5 py-3 flex items-center justify-between">
              <h2 className="text-white font-semibold text-sm">{editing ? 'Edit Receiver' : 'Add Receiver'}</h2>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  placeholder="Receiver name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={form.receiver_type_id}
                  onChange={e => setForm({ ...form, receiver_type_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                >
                  <option value="">Select type</option>
                  {receiverTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
                <select
                  value={form.branch_id}
                  onChange={e => setForm({ ...form, branch_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                >
                  <option value="">Select branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
                  placeholder="Address"
                />
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name.trim() || submitting}
                className="px-4 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : editing ? 'Update' : 'Add Receiver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
