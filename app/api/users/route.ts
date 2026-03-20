import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Check authorization - verify the request is from an authenticated admin user
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized: No auth token provided' },
        { status: 401 }
      )
    }

    // Create a client with the user's session to check their role
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get the current user from the auth header
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Malformed auth token' },
        { status: 401 }
      )
    }
    const token = authHeader.slice(7)
    const { data: { user }, error: userError } = await userClient.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      )
    }

    // Check if user is super admin - get the role name from roles table
    const { data: userProfile, error: profileError } = await userClient
      .from('users')
      .select('role_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // If role_id is an ID, join with roles table to get the role name
    let isAdmin = false
    if (userProfile.role_id) {
      const { data: roleData } = await userClient
        .from('roles')
        .select('name')
        .eq('id', userProfile.role_id)
        .single()
      
      isAdmin = roleData?.name === 'super_admin'
    }

    // Only Super Admin can create users
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admins can create users' },
        { status: 403 }
      )
    }

    // Now create the admin client for user creation
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const body = await request.json()

    const { full_name, email, password, phone, role_id, branch_id, reporting_manager, is_active } = body

    // Validate input
    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, full_name' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Step 1: Create auth user using admin API (server-side with service role)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: `Auth error: ${authError.message}` },
        { status: 400 }
      )
    }

    if (!authData.user?.id) {
      return NextResponse.json(
        { error: 'Failed to create authentication user' },
        { status: 400 }
      )
    }

    // Step 2: Create user profile with the auth user's ID
    const { data: profileData, error: profileCreateError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        full_name,
        email,
        phone: phone || null,
        role_id: role_id || null,
        branch_id: branch_id || null,
        reporting_manager: reporting_manager || null,
        is_active: is_active ?? true,
      })
      .select()
      .single()

    if (profileCreateError) {
      console.error('Profile error:', profileCreateError)
      return NextResponse.json(
        { error: `Profile error: ${profileCreateError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          user_id: authData.user.id,
          profile: profileData,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('User creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
