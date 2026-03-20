'use client'
import { useState, useEffect } from 'react'
import { useSession } from '@/lib/hooks/useSession'
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
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import type { User } from '@/types'

const ROLE_COLORS: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger' | 'purple'> = {
  employee: 'default',
  manager: 'info',
  hr: 'purple',
  dispatch: 'warning',
  branch_admin: 'success',
}

export default function BranchAdminUsersPage() {
  const { session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!session?.branchId) return
      const supabase = createClient()
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('branch_id', session.branchId)
        .order('full_name')
      setUsers((data ?? []) as User[])
      setLoading(false)
    }
    load()
  }, [session?.branchId])

  return (
    <div>
      <PageHeader
        title="Branch Users"
        description="All staff members assigned to your branch"
      />
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C0392B] border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Users className="mb-4 h-16 w-16 text-[#E2E8F0]" />
          <p className="text-lg font-medium text-[#1A1A2E]">No users found</p>
          <p className="text-sm text-[#64748B]">Users are assigned by the super admin</p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name ?? '—'}</TableCell>
                  <TableCell className="text-sm text-[#64748B]">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={ROLE_COLORS[user.role] ?? 'default'} className="capitalize">
                      {user.role.replace('_', ' ')}
                    </Badge>
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
