import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
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

