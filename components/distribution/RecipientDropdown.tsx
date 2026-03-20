'use client'
import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type { Recipient, RecipientType } from '@/types'

interface RecipientDropdownProps {
  recipientType: RecipientType
  branchId: string
  value?: string
  onChange: (recipientId: string) => void
  error?: string
}

export function RecipientDropdown({
  recipientType,
  branchId,
  value,
  onChange,
  error,
}: RecipientDropdownProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecipients() {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('recipients')
        .select('*')
        .eq('type', recipientType)
        .eq('branch_id', branchId)
        .eq('active', true)
        .order('name')
      setRecipients((data ?? []) as Recipient[])
      setLoading(false)
    }
    fetchRecipients()
  }, [recipientType, branchId])

  return (
    <div className="space-y-1.5">
      <Label>Recipient</Label>
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger className={error ? 'border-[#E74C3C]' : ''}>
          <SelectValue placeholder={loading ? 'Loading recipients...' : `Select ${recipientType}`} />
        </SelectTrigger>
        <SelectContent>
          {recipients.length === 0 && !loading ? (
            <div className="px-2 py-3 text-center text-sm text-[#64748B]">
              No {recipientType}s found for this branch
            </div>
          ) : (
            recipients.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
                {r.contact && (
                  <span className="ml-1 text-[#94A3B8]">({r.contact})</span>
                )}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-[#E74C3C]">{error}</p>}
    </div>
  )
}
