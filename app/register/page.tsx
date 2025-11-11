'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import toast from 'react-hot-toast'
import { Chrome } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'ORGANIZER' | 'ATTENDEE' | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const roleParam = searchParams.get('role')
    if (roleParam === 'organizer') {
      setRole('ORGANIZER')
    } else if (roleParam === 'attendee') {
      setRole('ATTENDEE')
    } else {
      // If no role specified, redirect to role selection
      router.push('/select-role?next=register')
    }
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!role) {
        toast.error('Please select an account type')
        return
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      toast.success('Account created successfully!')
      
      // Redirect based on role
      if (data.user.role === 'ORGANIZER') {
        router.push('/dashboard/organizer')
      } else {
        router.push('/dashboard/attendee')
      }
    } catch (error: any) {
      toast.error(error.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10 animate-fade-in-up">
          <h1 className="text-5xl font-extrabold text-white mb-3 text-shadow-lg">Join <span className="gradient-text">EventVerse</span></h1>
          <p className="text-xl text-primary-100/90">Create your account to get started</p>
        </div>

        <Card variant="elevated" className="p-8 md:p-10 animate-scale-in-bounce premium-border shine">
          <form onSubmit={handleSubmit} className="space-y-6">
            {role && (
              <div className="p-5 bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-xl border-2 border-primary-200/50 animate-fade-in-up">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Account Type</p>
                    <p className="font-bold text-lg gradient-text">
                      {role === 'ORGANIZER' ? 'Event Organizer' : 'Attendee / Customer'}
                    </p>
                  </div>
                  <Link
                    href="/select-role?next=register"
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors"
                  >
                    Change
                  </Link>
                </div>
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="John Doe"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
            />

            <Button type="submit" className="w-full" disabled={loading || !role}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full mt-4"
              onClick={() => {
                if (role) {
                  const roleParam = role.toLowerCase()
                  window.location.href = `/api/auth/google?role=${roleParam}`
                }
              }}
              disabled={!role}
            >
              <Chrome className="w-5 h-5 mr-2" />
              Sign up with Google
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-primary-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

