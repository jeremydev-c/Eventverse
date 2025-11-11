import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { querySTKPushStatus } from '@/lib/mpesa'
import { z } from 'zod'

const statusSchema = z.object({
  checkoutRequestId: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { checkoutRequestId } = statusSchema.parse(body)

    // Verify the checkout request belongs to the user
    const ticket = await prisma.ticket.findFirst({
      where: {
        mpesaCheckoutRequestId: checkoutRequestId,
        userId: user.id,
      },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Checkout request not found' },
        { status: 404 }
      )
    }

    // Query M-Pesa for payment status
    const statusResponse = await querySTKPushStatus({ checkoutRequestId })

    // If payment is successful, update tickets
    if (statusResponse.ResultCode === 0 && statusResponse.ResultDesc === 'The service request is processed successfully.') {
      // Find all tickets with this checkout request ID
      const tickets = await prisma.ticket.findMany({
        where: {
          mpesaCheckoutRequestId: checkoutRequestId,
          status: 'PENDING',
        },
      })

      if (tickets.length > 0) {
        // Extract receipt number from response if available
        const receiptNumber = statusResponse.CheckoutRequestID || ''

        await prisma.ticket.updateMany({
          where: {
            mpesaCheckoutRequestId: checkoutRequestId,
            status: 'PENDING',
          },
          data: {
            status: 'CONFIRMED',
            mpesaReceiptNumber: receiptNumber,
          },
        })
      }
    }

    return NextResponse.json({
      status: statusResponse.ResultCode === 0 ? 'success' : 'pending',
      resultCode: statusResponse.ResultCode,
      resultDesc: statusResponse.ResultDesc,
      response: statusResponse,
    })
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: err.errors },
        { status: 400 }
      )
    }

    if (err instanceof Error) {
      console.error('Error checking M-Pesa status:', err.message)
      return NextResponse.json(
        { error: err.message || 'Internal server error' },
        { status: 500 }
      )
    }

    console.error('Error checking M-Pesa status:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
