export const revalidate = 30

import { Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
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
import { AddUserModal } from '@/components/users/AddUserModal'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import type { User, Branch } from '@/types'

const ROLE_COLORS: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger' | 'purple'> = {
  employee: 'default',
  manager: 'info',
  hr: 'purple',
  dispatch: 'warning',
  branch_admin: 'success',
  super_admin: 'danger',
}

export default async function SuperAdminUsersPage() {
  const supabase = await createServiceClient()
  const [{ data: usersData }, { data: branchesData }] = await Promise.all([
    supabase.from('users').select('*, branch:branches(name)').order('name'),
    supabase.from('branches').select('id, name').eq('active', true).order('name'),
  ])

  const users = (usersData ?? []) as User[]
  const branches = (branchesData ?? []) as Branch[]

  return (
    <div>
      <PageHeader
        title="All Users"
        description="Every user registered in DuroShop"
        action={<AddUserModal branches={branches} />}
      />
      {users.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Users className="mb-4 h-16 w-16 text-[#E2E8F0]" />
          <p className="text-lg font-medium text-[#1A1A2E]">No users yet</p>
          <p className="mt-1 text-sm text-[#64748B]">Add your first user to get started</p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name ?? '—'}</TableCell>
                  <TableCell className="text-sm text-[#64748B]">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={ROLE_COLORS[user.role] ?? 'default'} className="capitalize">
                      {user.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-[#64748B]">
                    {(user.branch as { name?: string })?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm text-[#64748B]">
                    {formatDate(user.created_at)}
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
