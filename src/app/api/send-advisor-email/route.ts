import { sendAdvisorEmail } from '@/app/lib/resend'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      advisorEmail,
      clientAge,
      recommendedConversion,
      taxSavings,
      currentBracket,
      retirementBracket,
      rmdEst,
    } = body

    if (!advisorEmail) {
      return NextResponse.json({ error: 'Advisor email is required' }, { status: 400 })
    }

    const success = await sendAdvisorEmail(
      advisorEmail,
      'Your Client',
      clientAge,
      recommendedConversion,
      taxSavings,
      currentBracket,
      retirementBracket,
      rmdEst
    )

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in send-advisor-email:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
