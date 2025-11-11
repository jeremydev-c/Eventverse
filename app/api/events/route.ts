import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  venue: z.string().min(1),
  date: z.string(),
  endDate: z.string().optional(),
  category: z.string(),
  imageUrl: z.string().optional(),
  basePrice: z.number().min(0).default(0),
  currency: z.string().default('USD'),
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const date = searchParams.get('date')
    const organizerIdParam = searchParams.get('organizerId')

    const where: any = {}
    if (category) where.category = category
    if (date) {
      const dateObj = new Date(date)
      where.date = {
        gte: dateObj,
      }
    }
    
    // Handle "me" for organizerId
    if (organizerIdParam) {
      if (organizerIdParam === 'me') {
        const user = await getCurrentUser()
        if (user && user.role === 'ORGANIZER') {
          where.organizerId = user.id
        } else {
          return NextResponse.json({ events: [] })
        }
      } else {
        where.organizerId = organizerIdParam
      }
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    // Add confirmed ticket counts to each event
    const eventsWithCounts = await Promise.all(
      events.map(async (event) => {
        const confirmedTicketsCount = await prisma.ticket.count({
          where: {
            eventId: event.id,
            status: {
              in: ['CONFIRMED', 'CHECKED_IN'],
            },
          },
        })

        return {
          ...event,
          _count: {
            tickets: confirmedTicketsCount,
          },
        }
      })
    )

    return NextResponse.json({ events: eventsWithCounts })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ORGANIZER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createEventSchema.parse(body)

    const event = await prisma.event.create({
      data: {
        ...data,
        date: new Date(data.date),
        endDate: data.endDate ? new Date(data.endDate) : null,
        organizerId: user.id,
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

