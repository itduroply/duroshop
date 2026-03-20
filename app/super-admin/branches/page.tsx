export const revalidate = 30

import Link from 'next/link'
import { Plus, Building2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import type { Branch } from '@/types'

export default async function SuperAdminBranchesPage() {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('branches')
    .select('*')
    .order('name')
  const branches = (data ?? []) as Branch[]

  return (
    <div>
      <PageHeader
        title="Branches"
        description="Manage all DuroShop branches"
        action={
          <Button asChild size="sm">
            <Link href="/super-admin/branches/new">
              <Plus className="mr-2 h-4 w-4" /> New Branch
            </Link>
          </Button>
        }
      />
      {branches.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Building2 className="mb-4 h-16 w-16 text-[#E2E8F0]" />
          <p className="text-lg font-medium text-[#1A1A2E]">No branches yet</p>
          <p className="text-sm text-[#64748B]">Create the first branch to get started</p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">{branch.name}</TableCell>
                  <TableCell className="text-sm text-[#64748B]">{branch.location ?? '—'}</TableCell>
                  <TableCell>
                    {branch.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="gray">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-[#64748B]">
                    {formatDate(branch.created_at)}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/super-admin/branches/${branch.id}`}>Edit</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
