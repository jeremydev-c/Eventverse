import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  // Lazy import to avoid build-time evaluation
  const { stripe } = await import('@/lib/stripe')
  
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any

    // Fetch tickets by session ID (ticketIds are no longer in metadata due to 500 char limit)
    // All tickets with this session ID belong to this checkout
    await prisma.ticket.updateMany({
      where: {
        stripeSessionId: session.id,
        status: 'PENDING',
      },
      data: {
        status: 'CONFIRMED',
        stripePaymentId: session.payment_intent,
      },
    })

  }

  return NextResponse.json({ received: true })
}

