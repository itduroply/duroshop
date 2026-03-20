import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const supabase = await createServiceClient()
  const { data: user, error } = await supabase
    .from('users')
    .select('*, branch:branches(id, name)')
    .eq('email', email.toLowerCase().trim())
    .eq('active', true)
    .single()

  if (error || !user) {
    const detail = process.env.NODE_ENV === 'development' ? (error?.message ?? 'no row found') : ''
    return NextResponse.json({ error: `User not found. ${detail}`.trim() }, { status: 401 })
  }

  const session: import('@/lib/auth').Session = {
    userId: user.id,
    name: user.name,
    role: user.role,
    branchId: user.branch_id ?? undefined,
    branchName: (user.branch as { name?: string } | null)?.name ?? undefined,
  }

  const response = NextResponse.json({ success: true, role: user.role })
  response.cookies.set('session', JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return response
}
