'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { createBranch } from '@/lib/actions/branches'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  location: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function NewBranchPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setError('')
    const result = await createBranch(values)
    if (result.success) {
      router.push('/super-admin/branches')
    } else {
      setError(result.error ?? 'Failed to create branch')
      setSubmitting(false)
    }
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
      <PageHeader title="New Branch" description="Add a new branch to DuroShop" />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Branch Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Branch Name</Label>
              <Input id="name" placeholder="e.g. Lagos Island Branch" {...register('name')} />
              {errors.name && (
                <p className="text-xs text-[#E74C3C]">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location (optional)</Label>
              <Input id="location" placeholder="e.g. 14 Marina Street, Lagos" {...register('location')} />
            </div>
            {error && <p className="text-sm text-[#E74C3C]">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Creating…' : 'Create Branch'}
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
