'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [emailValid, setEmailValid] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const savedTheme = localStorage.getItem('duroshop-theme') || 'light'
    if (savedTheme === 'dark') {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    } else {
      setDarkMode(false)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('duroshop-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('duroshop-theme', 'light')
    }
  }

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    setEmailValid(validateEmail(value))
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Login failed: No user data returned')
        setLoading(false)
        return
      }

      // Check if user exists in users table
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (userError) {
        setError('Account setup incomplete. Please contact your administrator.')
        setLoading(false)
        return
      }

      if (!user) {
        setError('User record not found. Please contact admin.')
        setLoading(false)
        return
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ backgroundColor: '#C41E3A' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-white rounded-full blur-2xl"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <div className="flex items-center animate-fadeIn">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#C41E3A' }}>
                <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V5a2 2 0 00-2-2H5z"></path>
                <path d="M15 3a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2z"></path>
              </svg>
            </div>
            <span className="ml-3 text-white text-2xl font-bold">Duroshop</span>
          </div>

          <div className="animate-fadeIn">
            <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
              Enterprise Inventory
              <br />
              Management System
            </h1>
            <p className="text-white text-lg opacity-90 mb-8">
              Streamline your multi-branch requisition, approval, and dispatch workflows with intelligent automation.
            </p>

            <div className="space-y-4">
              <div className="flex items-start animate-slideIn" style={{ animationDelay: '0.1s' }}>
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-white font-semibold mb-1">Enterprise Security</h3>
                  <p className="text-white text-sm opacity-80">Bank-grade encryption and role-based access control</p>
                </div>
              </div>

              <div className="flex items-start animate-slideIn" style={{ animationDelay: '0.2s' }}>
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v4h8v-4zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-white font-semibold mb-1">Real-time Tracking</h3>
                  <p className="text-white text-sm opacity-80">Monitor stock levels and requisitions across all branches</p>
                </div>
              </div>

              <div className="flex items-start animate-slideIn" style={{ animationDelay: '0.3s' }}>
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-white font-semibold mb-1">Smart Analytics</h3>
                  <p className="text-white text-sm opacity-80">Data-driven insights for better inventory decisions</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-white text-sm opacity-70 animate-fadeIn">© 2024 Duroshop. All rights reserved.</div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 transition-colors duration-200" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#C41E3A' }}>
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V5a2 2 0 00-2-2H5z"></path>
                  <path d="M15 3a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2z"></path>
                </svg>
              </div>
              <span className="ml-3 text-gray-900 dark:text-white text-2xl font-bold">Duroshop</span>
            </div>
            <button
              onClick={toggleDarkMode}
              className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150 shadow-sm"
            >
              {darkMode ? (
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.536l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.828-2.828a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm.707 5.657a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707zM9 17a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1z" clipRule="evenodd"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                </svg>
              )}
            </button>
          </div>

          {/* Login Form Container */}
          <div className="bg-white rounded-2xl shadow-xl p-8 transition-all duration-300 border border-gray-200" style={{ display: showForgotPassword ? 'none' : 'block' }}>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
              <p className="text-gray-600">Sign in to your Duroshop account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Email Input */}
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={handleEmailChange}
                  className="w-full px-4 py-3 border rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-3 transition-all duration-150"
                  placeholder="Email Address"
                  required
                  style={{ borderColor: '#E0E0E0', '--tw-ring-color': '#C41E3A' } as any}
                />
                {emailValid && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-500">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                )}
              </div>

              {/* Password Input */}
              <div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-3 transition-all duration-150"
                    placeholder="Password"
                    required
                    minLength={6}
                    style={{ borderColor: '#E0E0E0', '--tw-ring-color': '#C41E3A' } as any}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-150"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"></path>
                      </svg>
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm hover:opacity-80 transition-colors duration-150 font-medium"
                    style={{ color: '#C41E3A' }}
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded focus:ring-red-500" style={{ accentColor: '#C41E3A' }} />
                <span className="ml-2 text-sm text-gray-600">Remember me for 30 days</span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white py-3 rounded-xl font-medium transition-all duration-150 hover:-translate-y-1 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{ backgroundColor: '#C41E3A' }}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link href="/setup" className="hover:opacity-80 transition-colors duration-150 font-medium" style={{ color: '#C41E3A' }}>
                  Create admin account
                </Link>
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-center text-xs text-gray-500">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                </svg>
                Secured with 256-bit SSL encryption
              </div>
            </div>
          </div>

          {/* Forgot Password Form */}
          {showForgotPassword && (
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
              <button
                onClick={() => setShowForgotPassword(false)}
                className="text-gray-600 hover:text-gray-900 mb-4 flex items-center transition-colors duration-150 group"
              >
                <svg className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"></path>
                </svg>
                Back to login
              </button>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Reset password</h2>
                <p className="text-gray-600">Enter your email and we&apos;ll send you reset instructions</p>
              </div>
              <p className="text-sm text-gray-600 text-center mt-8 pt-6 border-t border-gray-200">
                <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                </svg>
                Contact your administrator to reset your password
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }

        .animate-slideIn {
          animation: slideIn 0.35s ease-out;
        }
      `}</style>
    </div>
  )
}
