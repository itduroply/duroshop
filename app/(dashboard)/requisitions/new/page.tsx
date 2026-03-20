"use client"

import { useMemo, useState, useEffect } from 'react'
import { User } from '@/types'
import { createClient } from '@/lib/supabase/client'

const steps = [
  { title: 'Category', subtitle: 'Select type' },
  { title: 'Items', subtitle: 'Choose products' },
  { title: 'Details', subtitle: 'Add information' },
  { title: 'Review', subtitle: 'Confirm & submit' },
]

interface Category {
  id: string
  name: string
  description: string | null
  icon_url: string | null
  display_order: number | null
}

interface Item {
  id: string
  name: string
  total_qty: number
  image_url: string | null
  category_id: string | null
}

export default function NewRequisitionPage() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [items, setItems] = useState<Item[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)

  const progressWidth = useMemo(() => `${(currentStep / 4) * 100}%`, [currentStep])

  // Fetch current user profile on mount
  useEffect(() => {
    const fetchUser = async () => {
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
    }
    fetchUser()
  }, [supabase])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true)
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, description, icon_url, display_order')
          .eq('is_active', true)
          .order('display_order', { ascending: true })

        if (error) {
          console.error('Failed to load categories:', error)
          setCategories([])
          return
        }

        setCategories((data || []) as Category[])
      } finally {
        setCategoriesLoading(false)
      }
    }

    fetchCategories()
  }, [supabase])

  useEffect(() => {
    const fetchItems = async () => {
      if (!selectedCategory) {
        setItems([])
        return
      }

      try {
        setItemsLoading(true)
        const { data, error } = await supabase
          .from('items')
          .select('id, name, total_qty, image_url, category_id')
          .eq('category_id', selectedCategory)
          .eq('is_active', true)
          .order('name', { ascending: true })

        if (error) {
          console.error('Failed to load items:', error)
          setItems([])
          return
        }

        setItems((data || []) as Item[])
      } finally {
        setItemsLoading(false)
      }
    }

    fetchItems()
    setSelectedItems({})
  }, [selectedCategory, supabase])

  const updateItemQty = (id: string, delta: number) => {
    setSelectedItems((prev) => {
      const next = { ...prev }
      const current = next[id] ?? 0
      const value = Math.max(0, current + delta)
      if (value === 0) {
        delete next[id]
      } else {
        next[id] = value
      }
      return next
    })
  }

  const stepValid = () => {
    if (currentStep === 1) return Boolean(selectedCategory)
    if (currentStep === 2) return Object.keys(selectedItems).length > 0
    if (currentStep === 3) return reason.trim().length > 0 && expectedDate.length > 0
    return true
  }

  const handleSubmit = async () => {
    if (!user) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      // Create the stock request, assigned to reporting manager
      const { data: stockRequest, error: reqError } = await supabase
        .from('stock_requests')
        .insert({
          branch_id: user.branch_id || null,
          requested_by: user.id,
          status: 'pending_rm_approval',
          reason,
          expected_date: expectedDate,
          notes: notes || null,
          category_id: selectedCategory,
          assigned_to: user.reporting_manager || null,
        })
        .select('id')
        .single()

      if (reqError || !stockRequest) {
        setSubmitError(reqError?.message || 'Failed to create request')
        return
      }

      // Insert request items
      const itemRows = Object.entries(selectedItems).map(([itemId, qty]) => ({
        stock_request_id: stockRequest.id,
        item_id: itemId,
        quantity: qty,
      }))

      const { error: itemsError } = await supabase
        .from('stock_request_items')
        .insert(itemRows)

      if (itemsError) {
        setSubmitError(itemsError.message)
        return
      }

      // Send notification to reporting manager
      if (user.reporting_manager) {
        await supabase.from('notifications').insert({
          user_id: user.reporting_manager,
          title: 'New Requisition Request',
          message: `${user.name} has submitted a new requisition request for your approval.`,
        })
      }

      setSubmitted(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Raise Requisition</h1>
                <p className="text-sm text-slate-500">Create a new requisition request</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const stepNumber = index + 1
                const isActive = currentStep === stepNumber
                const isComplete = currentStep > stepNumber
                return (
                  <div key={step.title} className="flex items-center flex-1">
                    <div className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                          isComplete
                            ? 'bg-emerald-500 text-white'
                            : isActive
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isComplete ? <i className="fa-solid fa-check text-xs"></i> : stepNumber}
                      </div>
                      <div className="ml-3">
                        <p className={`text-sm font-semibold ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                          {step.title}
                        </p>
                        <p className="text-xs text-slate-400">{step.subtitle}</p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 ${currentStep > stepNumber ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-6 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-600 to-red-700 transition-all" style={{ width: progressWidth }} />
            </div>
          </div>

          {!submitted && (
            <div className="rounded-2xl bg-white border border-slate-200 p-8 shadow-sm">
              {currentStep === 1 && (
                <div>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Select Category</h2>
                    <p className="text-sm text-slate-500">Choose the type of items you need</p>
                  </div>
                  {categoriesLoading ? (
                    <div className="text-center text-sm text-slate-500">Loading categories...</div>
                  ) : categories.length === 0 ? (
                    <div className="text-center text-sm text-slate-500">No active categories available.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`text-left border rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-lg ${
                            selectedCategory === category.id ? 'border-red-600 ring-2 ring-red-100' : 'border-slate-200'
                          }`}
                        >
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-100">
                            {category.icon_url ? (
                              <img
                                src={category.icon_url}
                                alt={category.name}
                                className="w-10 h-10 object-contain"
                              />
                            ) : (
                              <i className="fa-solid fa-tag text-slate-500 text-xl"></i>
                            )}
                          </div>
                          <h3 className="mt-4 font-semibold text-slate-900">{category.name}</h3>
                          <p className="text-xs text-slate-500 mt-1">{category.description || 'No description'}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {currentStep === 2 && (
                <div>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Select Items</h2>
                    <p className="text-sm text-slate-500">Choose the items you need and specify quantities</p>
                  </div>
                  {!selectedCategory ? (
                    <div className="text-center text-sm text-slate-500">Select a category to view items.</div>
                  ) : itemsLoading ? (
                    <div className="text-center text-sm text-slate-500">Loading items...</div>
                  ) : items.length === 0 ? (
                    <div className="text-center text-sm text-slate-500">No items available for this category.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={`border rounded-2xl p-4 transition-all ${
                            selectedItems[item.id] ? 'border-red-600 bg-red-50/40' : 'border-slate-200'
                          }`}
                        >
                          <div className="h-24 bg-slate-100 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <i className="fa-solid fa-box-open text-slate-400 text-xl"></i>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-slate-900">{item.name}</h4>
                          <p className={`text-xs mt-1 ${item.total_qty <= 10 ? 'text-amber-600' : 'text-slate-500'}`}>
                            Available: {item.total_qty}
                          </p>
                          <div className="mt-3 flex items-center justify-between border rounded-lg border-slate-200">
                            <button
                              onClick={() => updateItemQty(item.id, -1)}
                              className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-red-600 hover:text-white rounded-l-lg"
                            >
                              <i className="fa-solid fa-minus text-xs"></i>
                            </button>
                            <span className="text-sm font-medium text-slate-900">
                              {selectedItems[item.id] ?? 0}
                            </span>
                            <button
                              onClick={() => updateItemQty(item.id, 1)}
                              className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-red-600 hover:text-white rounded-r-lg"
                            >
                              <i className="fa-solid fa-plus text-xs"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {currentStep === 3 && (
                <div>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Requisition Details</h2>
                    <p className="text-sm text-slate-500">Provide additional information for your request</p>
                  </div>
                  <div className="max-w-3xl mx-auto space-y-6">
                    <div className="border border-slate-200 rounded-2xl p-6">
                      <label className="block text-sm font-semibold text-slate-900 mb-2">Reason for Request *</label>
                      <textarea
                        rows={4}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                        placeholder="Please explain why you need these items..."
                      />
                      <p className="text-xs text-slate-500 mt-2">Provide a clear justification for your manager.</p>
                    </div>
                    <div className="border border-slate-200 rounded-2xl p-6">
                      <label className="block text-sm font-semibold text-slate-900 mb-2">Expected Date *</label>
                      <input
                        type="date"
                        value={expectedDate}
                        onChange={(event) => setExpectedDate(event.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                      <p className="text-xs text-slate-500 mt-2">When do you need these items by?</p>
                    </div>
                    <div className="border border-slate-200 rounded-2xl p-6">
                      <label className="block text-sm font-semibold text-slate-900 mb-2">Additional Notes (Optional)</label>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                        placeholder="Any other information that might be helpful..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Review & Submit</h2>
                    <p className="text-sm text-slate-500">Please review your requisition before submitting</p>
                  </div>
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="border border-slate-200 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900">Selected Items</h3>
                        <button
                          onClick={() => setCurrentStep(2)}
                          className="text-sm font-medium text-red-600 hover:underline"
                        >
                          <i className="fa-solid fa-edit mr-1"></i>Edit Items
                        </button>
                      </div>
                      <div className="space-y-3">
                        {Object.keys(selectedItems).length === 0 && (
                          <p className="text-sm text-slate-500">No items selected yet.</p>
                        )}
                        {Object.entries(selectedItems).map(([id, qty]) => {
                          const item = items.find((entry) => entry.id === id)
                          return (
                            <div key={id} className="flex items-center justify-between border-b border-slate-200 pb-3">
                              <div>
                                <p className="text-sm font-medium text-slate-900">{item?.name}</p>
                                <p className="text-xs text-slate-500">Quantity: {qty}</p>
                              </div>
                              <span className="text-xs text-slate-500">Available: {item?.total_qty}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900">Request Details</h3>
                        <button
                          onClick={() => setCurrentStep(3)}
                          className="text-sm font-medium text-red-600 hover:underline"
                        >
                          <i className="fa-solid fa-edit mr-1"></i>Edit Details
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-semibold text-slate-500">REASON</p>
                          <p className="text-sm text-slate-900">{reason || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500">EXPECTED DATE</p>
                          <p className="text-sm text-slate-900">{expectedDate || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500">NOTES</p>
                          <p className="text-sm text-slate-900">{notes || '—'}</p>
                        </div>
                      </div>
                    </div>

                    {submitError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        {submitError}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {submitted && (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500 text-white mx-auto flex items-center justify-center mb-6">
                <i className="fa-solid fa-check text-3xl"></i>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Requisition Submitted!</h2>
              <p className="text-sm text-slate-500 mb-8">Your request has been sent to your reporting manager for approval.</p>
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={() => {
                    setSubmitted(false)
                    setCurrentStep(1)
                    setSelectedCategory(null)
                    setSelectedItems({})
                    setReason('')
                    setExpectedDate('')
                    setNotes('')
                    setSubmitError(null)
                  }}
                  className="px-6 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Create Another Request
                </button>
              </div>
            </div>
          )}

          {!submitted && (
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                className={`px-6 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 ${
                  currentStep === 1 ? 'invisible' : ''
                }`}
              >
                <i className="fa-solid fa-arrow-left mr-2"></i>Back
              </button>
              <div className="flex-1"></div>
              {currentStep < 4 && (
                <button
                  disabled={!stepValid()}
                  onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
                  className="px-8 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue <i className="fa-solid fa-arrow-right ml-2"></i>
                </button>
              )}
              {currentStep === 4 && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-8 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <><i className="fa-solid fa-spinner animate-spin mr-2"></i>Submitting...</>
                  ) : (
                    'Submit Requisition'
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
