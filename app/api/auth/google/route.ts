import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Always use localhost for OAuth callbacks (Google doesn't allow private IPs)
  // Use a separate env var if needed, otherwise default to localhost
  const baseUrl = process.env.OAUTH_CALLBACK_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  // Force localhost for OAuth if baseUrl contains a private IP
  const oauthBaseUrl = baseUrl.includes('192.168.') || baseUrl.includes('10.') || baseUrl.includes('172.')
    ? 'http://localhost:3000'
    : baseUrl
  const clientId = process.env.GOOGLE_CLIENT_ID

  if (!clientId) {
    return NextResponse.json(
      { error: 'Google OAuth not configured' },
      { status: 500 }
    )
  }

  // Get role from query parameter (optional)
  const searchParams = request.nextUrl.searchParams
  const role = searchParams.get('role') // 'organizer' or 'attendee'

  // Generate state parameter for CSRF protection
  // Include role in state if provided
  const stateToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  const state = role ? `${stateToken}:${role}` : stateToken
  
  // Store state in cookie
  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(`${oauthBaseUrl}/api/auth/callback/google`)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('openid email profile')}&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `state=${encodeURIComponent(state)}`
  )

  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
  })

  return response
}

