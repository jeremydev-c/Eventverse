import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { generateTicketId, generateQRCode } from '@/lib/qrcode'
import { z } from 'zod'

const createTicketSchema = z.object({
  eventId: z.string(),
  quantity: z.number().min(1).default(1),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { eventId, quantity } = createTicketSchema.parse(body)

    // Fetch event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Calculate price
    const price = event.basePrice

    // Get base URL for QR code URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Generate ticket data (create tickets first to get IDs, then generate QR codes)
    const ticketData = []
    for (let i = 0; i < quantity; i++) {
      const ticketId = generateTicketId()
      // Store both old format (for scanner) and will add URL format
      const qrCodeData = `${eventId}:${ticketId}:${user.id}`

      ticketData.push({
        eventId,
        userId: user.id,
        price,
        qrCodeData,
        status: 'PENDING' as const,
        // Explicitly omit stripePaymentId and stripeSessionId to avoid unique constraint issues
      })
    }

    // Create tickets using createMany
    await prisma.ticket.createMany({
      data: ticketData,
    })

    // Fetch the created tickets to get their IDs
    const createdTickets = await prisma.ticket.findMany({
      where: {
        eventId,
        userId: user.id,
        qrCodeData: { in: ticketData.map(t => t.qrCodeData) },
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: quantity,
    })

    // Generate QR codes with ticket receipt URLs
    const tickets = await Promise.all(
      createdTickets.map(async (ticket) => {
        // Create URL that opens ticket receipt page
        const ticketUrl = `${baseUrl}/tickets/${ticket.id}`
        console.log(`Generating QR code for ticket ${ticket.id} with URL: ${ticketUrl}`)
        
        // Generate QR code with the URL
        const qrCodeImage = await generateQRCode(ticketUrl)

        // Update ticket with QR code image
        const updatedTicket = await prisma.ticket.update({
          where: { id: ticket.id },
          data: { qrCodeImage },
        })

        return updatedTicket
      })
    )

    return NextResponse.json({ tickets }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating tickets:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

