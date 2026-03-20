'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SetupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const supabase = createClient()

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })

      if (signUpError) {
        setMessage({ type: 'error', text: signUpError.message })
        setLoading(false)
        return
      }

      if (!authData.user) {
        setMessage({ type: 'error', text: 'Failed to create user' })
        setLoading(false)
        return
      }

      // Get super_admin role ID from roles table
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'super_admin')
        .single()

      let roleId = null
      if (!rolesError && roles) {
        roleId = roles.id
      }

      // Create user record in users table
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          full_name: fullName,
          email: email,
          phone: '', // Will be updated later
          role_id: roleId, // Set to super_admin role ID if found
          is_active: true,
        })

      if (userError) {
        console.error('User record creation error:', userError)
        setMessage({ 
          type: 'error', 
          text: `User created but user record failed: ${userError.message}. User ID: ${authData.user.id}` 
        })
        setLoading(false)
        return
      }

      setMessage({ 
        type: 'success', 
        text: 'Super Admin user created successfully! You can now login.' 
      })
      
      // Reset form
      setEmail('')
      setPassword('')
      setFullName('')
      setLoading(false)
    } catch (err) {
      console.error('Setup error:', err)
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Duroshop Setup</CardTitle>
          <CardDescription>
            Create your first Super Admin account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            {message && (
              <div className={`rounded-md p-3 text-sm ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800' 
                  : 'bg-red-50 text-red-800'
              }`}>
                {message.text}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <p className="text-xs text-gray-500">Minimum 6 characters</p>
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Super Admin'}
            </Button>

            <div className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Sign in
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
