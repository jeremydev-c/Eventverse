'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Sparkles, LogOut, User } from 'lucide-react'
import toast from 'react-hot-toast'

interface User {
  id: string
  email: string
  name: string
  role: 'ORGANIZER' | 'ATTENDEE'
}

export function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      if (res.ok) {
        setUser(null)
        toast.success('Logged out successfully')
        router.push('/')
      }
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Failed to logout')
    }
  }

  // Don't show navigation on auth pages
  if (pathname?.startsWith('/login') || pathname?.startsWith('/register')) {
    return null
  }

  if (loading) {
    return null
  }

  return (
    <nav className="glass border-b border-white/20 sticky top-0 z-50 backdrop-blur-xl shadow-soft">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold gradient-text hover:scale-105 transition-transform duration-300">
            <Sparkles className="w-6 h-6 text-primary-500 animate-pulse" />
            EventVerse
          </Link>

          <div className="flex items-center gap-4">
            <Link 
              href="/events" 
              className="text-gray-700 font-medium hover:text-primary-600 transition-all duration-300 hover:scale-105 px-3 py-2 rounded-lg hover:bg-primary-50"
            >
              Events
            </Link>

            {user ? (
              <>
                {user.role === 'ORGANIZER' ? (
                  <Link href="/dashboard/organizer">
                    <Button variant="ghost" size="sm">
                      <User className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link href="/dashboard/attendee">
                    <Button variant="ghost" size="sm">
                      <User className="w-4 h-4 mr-2" />
                      My Tickets
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/select-role?next=login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link href="/select-role?next=register">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

