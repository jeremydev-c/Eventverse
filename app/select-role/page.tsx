'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Calendar, Users, ArrowRight, Chrome } from 'lucide-react'

function SelectRoleForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedRole, setSelectedRole] = useState<'ORGANIZER' | 'ATTENDEE' | null>(null)
  
  const nextAction = searchParams.get('next') || 'register' // 'register' or 'login'

  const handleContinue = () => {
    if (!selectedRole) return
    
    if (nextAction === 'login') {
      router.push(`/login?role=${selectedRole.toLowerCase()}`)
    } else {
      router.push(`/register?role=${selectedRole.toLowerCase()}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        <div className="text-center mb-10 animate-fade-in-up">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 text-shadow-lg">
            Welcome to <span className="gradient-text">EventVerse</span>
          </h1>
          <p className="text-xl text-primary-100/90">
            {nextAction === 'login' ? 'Sign in to continue' : 'Create your account to get started'}
          </p>
        </div>

        <Card variant="elevated" className="p-8 md:p-10 animate-scale-in-bounce premium-border shine">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-10 text-center gradient-text-slow text-shadow">
            I am a...
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Attendee Option */}
            <button
              onClick={() => setSelectedRole('ATTENDEE')}
              className={`p-6 md:p-8 rounded-2xl border-2 transition-all duration-500 text-left hover-lift card-hover ${
                selectedRole === 'ATTENDEE'
                  ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100 shadow-premium-lg shadow-primary-500/30 scale-110 premium-border'
                  : 'border-gray-200 hover:border-primary-400 hover:bg-gray-50/90 hover:shadow-premium'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-4 rounded-xl transition-all duration-300 ${
                  selectedRole === 'ATTENDEE' 
                    ? 'bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30 scale-110' 
                    : 'bg-gray-200'
                }`}>
                  <Users className={`w-6 h-6 transition-colors duration-300 ${
                    selectedRole === 'ATTENDEE' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Attendee / Customer
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    I want to discover and book events, buy tickets, and attend amazing experiences.
                  </p>
                </div>
                {selectedRole === 'ATTENDEE' && (
                  <div className="text-primary-500 animate-slide-down">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}
              </div>
            </button>

            {/* Organizer Option */}
            <button
              onClick={() => setSelectedRole('ORGANIZER')}
              className={`p-6 md:p-8 rounded-2xl border-2 transition-all duration-500 text-left hover-lift card-hover ${
                selectedRole === 'ORGANIZER'
                  ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100 shadow-premium-lg shadow-primary-500/30 scale-110 premium-border'
                  : 'border-gray-200 hover:border-primary-400 hover:bg-gray-50/90 hover:shadow-premium'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-4 rounded-xl transition-all duration-300 ${
                  selectedRole === 'ORGANIZER' 
                    ? 'bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30 scale-110' 
                    : 'bg-gray-200'
                }`}>
                  <Calendar className={`w-6 h-6 transition-colors duration-300 ${
                    selectedRole === 'ORGANIZER' ? 'text-white' : 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Event Organizer
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    I want to create events, manage ticket sales, and track attendance.
                  </p>
                </div>
                {selectedRole === 'ORGANIZER' && (
                  <div className="text-primary-500 animate-slide-down">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}
              </div>
            </button>
          </div>

          <Button
            onClick={handleContinue}
            disabled={!selectedRole}
            className="w-full"
            size="lg"
          >
            Continue
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

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
                if (selectedRole) {
                  const roleParam = selectedRole.toLowerCase()
                  window.location.href = `/api/auth/google?role=${roleParam}`
                }
              }}
              disabled={!selectedRole}
            >
              <Chrome className="w-5 h-5 mr-2" />
              {nextAction === 'login' ? 'Sign in' : 'Sign up'} with Google
            </Button>
          </div>

          <div className="mt-6 text-center">
            <Link
              href={nextAction === 'login' ? '/select-role?next=register' : '/select-role?next=login'}
              className="text-primary-600 hover:underline text-sm"
            >
              {nextAction === 'login' 
                ? "Don't have an account? Sign up" 
                : 'Already have an account? Sign in'}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function SelectRolePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 flex items-center justify-center">
        <div className="text-xl text-white">Loading...</div>
      </div>
    }>
      <SelectRoleForm />
    </Suspense>
  )
}

