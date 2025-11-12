import Stripe from 'stripe'

// Lazy initialization to avoid errors during build time
let stripeInstance: Stripe | null = null

function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      // During build (when NEXT_PHASE is 'phase-production-build'), use dummy key
      // This allows the build to complete, but will fail at runtime if env var is missing
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        stripeInstance = new Stripe('sk_test_dummy_key_for_build', {
          apiVersion: '2025-02-24.acacia',
        })
      } else {
        throw new Error('STRIPE_SECRET_KEY is not set')
      }
    } else {
      stripeInstance = new Stripe(secretKey, {
        apiVersion: '2025-02-24.acacia',
      })
    }
  }
  return stripeInstance
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe]
  },
})

export async function createCheckoutSession(
  ticketIds: string[],
  eventId: string,
  userId: string,
  successUrl: string,
  cancelUrl: string,
  tickets: Array<{ id: string; price: number; event: { title: string } }>
) {
  // Store only essential metadata (ticketIds can be fetched by session ID from database)
  // Stripe metadata has a 500 character limit, so we can't store all ticket IDs
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: tickets.map((ticket) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${ticket.event.title} - Ticket`,
        },
        unit_amount: Math.round(ticket.price * 100), // Convert to cents
      },
      quantity: 1,
    })),
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      eventId,
      userId,
      ticketCount: tickets.length.toString(), // Store count instead of all IDs
    },
  })

  return session
}

