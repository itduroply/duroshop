'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/PageHeader'
import { updateBranch } from '@/lib/actions/branches'
import { createClient } from '@/lib/supabase/client'
import type { Branch } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  location: z.string().optional(),
  is_active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

export default function EditBranchPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [branch, setBranch] = useState<Branch | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase.from('branches').select('*').eq('id', id).single()
      if (data) {
        const b = data as Branch
        setBranch(b)
        reset({ name: b.name, location: b.location ?? '', is_active: b.is_active })
      }
      setLoading(false)
    }
    load()
  }, [id, reset])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setError('')
    const result = await updateBranch({ id, ...values })
    if (result.success) {
      router.push('/super-admin/branches')
    } else {
      setError(result.error ?? 'Failed to update branch')
      setSubmitting(false)
    }
  }

  const isActive = watch('is_active')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C0392B] border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/super-admin/branches">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Branches
          </Link>
        </Button>
      </div>
      <PageHeader
        title={`Edit Branch: ${branch?.name}`}
        description="Update branch details and status"
      />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Branch Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Branch Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-xs text-[#E74C3C]">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register('location')} />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setValue('is_active', e.target.checked)}
                className="h-4 w-4 rounded border-[#E2E8F0] accent-[#C0392B]"
              />
              <Label htmlFor="is_active">Branch is active</Label>
            </div>
            {error && <p className="text-sm text-[#E74C3C]">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/super-admin/branches">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
