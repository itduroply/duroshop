import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser()

  // Check if user has a complete profile in users table
  let hasCompleteProfile = false
  if (!getUserError && user) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    hasCompleteProfile = !!userProfile
  }

  // Protected routes - require complete auth + profile
  const protectedPaths = ['/dashboard', '/inventory', '/stock-requests', '/distributions', '/receivers', '/reports', '/activity-logs', '/visiting-cards', '/visiting-card-approvals']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // Redirect if accessing protected routes without complete auth
  if ((!user || !hasCompleteProfile) && isProtectedPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
