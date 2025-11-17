import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateToken } from '@/lib/auth'

// Force dynamic rendering - this route uses searchParams and cookies
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Helper function to get the correct base URL for redirects (avoids 0.0.0.0 issues)
function getRedirectBaseUrl(requestUrl: URL): string {
  const hostname = requestUrl.hostname
  // If hostname is 0.0.0.0 or a private IP, use localhost
  if (hostname === '0.0.0.0' || hostname.includes('192.168.') || hostname.includes('10.') || hostname.includes('172.')) {
    return 'http://localhost:3000'
  }
  return `${requestUrl.protocol}//${requestUrl.host}`
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const requestUrl = new URL(request.url)
    const redirectBaseUrl = getRedirectBaseUrl(requestUrl)

    // Check for OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error)}`, redirectBaseUrl)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/login?error=invalid_request', redirectBaseUrl)
      )
    }

    // Verify state parameter (CSRF protection)
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const storedState = cookieStore.get('oauth_state')?.value

    // Extract role from state if present (format: "token:role")
    let selectedRole: 'ORGANIZER' | 'ATTENDEE' | null = null
    const stateParts = state.split(':')
    const stateToken = stateParts[0]
    if (stateParts.length > 1) {
      const roleParam = stateParts[1]
      if (roleParam === 'organizer') {
        selectedRole = 'ORGANIZER'
      } else if (roleParam === 'attendee') {
        selectedRole = 'ATTENDEE'
      }
    }

    const storedStateToken = storedState?.split(':')[0]
    if (!storedState || storedStateToken !== stateToken) {
      return NextResponse.redirect(
        new URL('/login?error=invalid_state', redirectBaseUrl)
      )
    }

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    // Always use localhost for OAuth callbacks (Google doesn't allow private IPs)
    const baseUrl = process.env.OAUTH_CALLBACK_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    // Force localhost for OAuth if baseUrl contains a private IP
    const oauthBaseUrl = baseUrl.includes('192.168.') || baseUrl.includes('10.') || baseUrl.includes('172.')
      ? 'http://localhost:3000'
      : baseUrl
    const redirectUri = `${oauthBaseUrl}/api/auth/callback/google`

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Token exchange error:', tokens)
      return NextResponse.redirect(
        new URL('/login?error=token_exchange_failed', redirectBaseUrl)
      )
    }

    // Get user info from Google
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    )

    const userInfo = await userInfoResponse.json()

    if (!userInfoResponse.ok || !userInfo || !userInfo.id || !userInfo.email) {
      console.error('Invalid user info:', userInfo)
      return NextResponse.redirect(
        new URL('/login?error=user_info_failed', redirectBaseUrl)
      )
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { googleId: userInfo.id },
    })

    if (!user) {
      // Check if user exists with same email
      let existingUser = null
      try {
        existingUser = await prisma.user.findUnique({
          where: { email: userInfo.email },
        })
      } catch (error: any) {
        // If enum error, user exists but has invalid role - try to update it
        if (error.message?.includes('not found in enum')) {
          console.warn('User with invalid role found, attempting to fix and link Google account')
          // Use raw query to find and update the user
          try {
            const users = await prisma.$runCommandRaw({
              findAndModify: 'users',
              query: { email: userInfo.email },
              update: { 
                $set: { 
                  googleId: userInfo.id,
                  role: 'ORGANIZER' // Fix the role while we're at it
                } 
              },
              new: true
            })
            // If successful, fetch the updated user
            if (users && users.value) {
              existingUser = await prisma.user.findUnique({
                where: { email: userInfo.email },
              })
            }
          } catch (updateError) {
            console.error('Failed to update user with invalid role:', updateError)
          }
        } else {
          throw error
        }
      }

      if (existingUser) {
        // User exists - link Google account to existing user
        if (existingUser.role === 'ORGANIZER' || existingUser.role === 'ATTENDEE') {
          user = await prisma.user.update({
            where: { id: existingUser.id },
            data: { googleId: userInfo.id },
          })
        } else {
          // User has invalid role - fix it and link Google account
          user = await prisma.user.update({
            where: { id: existingUser.id },
            data: { 
              googleId: userInfo.id,
              role: 'ORGANIZER' // Fix invalid role
            },
          })
        }
      } else {
        // User doesn't exist - create new user with selected role
        const newUserRole = selectedRole || 'ATTENDEE'
        try {
          user = await prisma.user.create({
            data: {
              email: userInfo.email,
              name: userInfo.name || userInfo.email.split('@')[0],
              googleId: userInfo.id,
              password: null, // No password for OAuth users
              role: newUserRole,
            },
          })
        } catch (createError: any) {
          // If email already exists (race condition), try to find and link
          if (createError.code === 'P2002' && createError.meta?.target?.includes('email')) {
            console.warn('Email already exists, attempting to link Google account')
            // Fetch the existing user and update it
            const raceConditionUser = await prisma.user.findUnique({
              where: { email: userInfo.email },
            })
            if (raceConditionUser) {
              user = await prisma.user.update({
                where: { id: raceConditionUser.id },
                data: { googleId: userInfo.id },
              })
            } else {
              throw createError
            }
          } else {
            throw createError
          }
        }
      }
    }

    if (!user || !user.id) {
      console.error('User creation/lookup failed')
      return NextResponse.redirect(
        new URL('/login?error=user_creation_failed', redirectBaseUrl)
      )
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Determine redirect based on user role
    let redirectPath = '/dashboard/attendee'
    if (user.role === 'ORGANIZER') {
      redirectPath = '/dashboard/organizer'
    }
    
    // Clear OAuth state cookie
    const response = NextResponse.redirect(
      new URL(redirectPath, redirectBaseUrl)
    )

    response.cookies.delete('oauth_state')
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error: any) {
    console.error('Google OAuth callback error:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
    })
    const requestUrl = new URL(request.url)
    const errorRedirectBaseUrl = getRedirectBaseUrl(requestUrl)
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error?.message || 'internal_error')}`, errorRedirectBaseUrl)
    )
  }
}

