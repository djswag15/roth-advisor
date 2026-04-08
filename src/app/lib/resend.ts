import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY

let resend: Resend | null = null

function getResend() {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable is not set')
  }
  if (!resend) {
    resend = new Resend(RESEND_API_KEY)
  }
  return resend
}

// Email templates
export const emailTemplates = {
  advisorSummary: (
    userName: string,
    age: number,
    recommendedConversion: number,
    taxSavings: number,
    currentBracket: number,
    retirementBracket: number,
    rmdEst: number
  ) => ({
    subject: `Your Roth Conversion Analysis from NestWise`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; }
            .content { padding: 30px 20px; }
            .metric-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
            .metric-label { font-weight: 600; color: #666; }
            .metric-value { font-weight: 700; color: #1f2937; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; }
            .footer { text-align: center; padding: 20px 0; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Roth Conversion Analysis</h1>
              <p>Generated from NestWise</p>
            </div>
            
            <div class="content">
              <p>Hi ${userName},</p>
              
              <p>Your NestWise analysis has been completed. Here's your personalized strategy:</p>
              
              <div class="metric-row">
                <span class="metric-label">Age:</span>
                <span class="metric-value">${age}</span>
              </div>
              
              <div class="metric-row">
                <span class="metric-label">Recommended Annual Conversion:</span>
                <span class="metric-value">$${recommendedConversion.toLocaleString()}</span>
              </div>
              
              <div class="metric-row">
                <span class="metric-label">Potential 30-Year Tax Savings:</span>
                <span class="metric-value">$${taxSavings.toLocaleString()}</span>
              </div>
              
              <div class="metric-row">
                <span class="metric-label">Your Current Tax Bracket:</span>
                <span class="metric-value">${currentBracket}%</span>
              </div>
              
              <div class="metric-row">
                <span class="metric-label">Est. Retirement Bracket:</span>
                <span class="metric-value">${retirementBracket}%</span>
              </div>
              
              <div class="metric-row">
                <span class="metric-label">Est. Annual RMD (if no conversion):</span>
                <span class="metric-value">$${rmdEst.toLocaleString()}</span>
              </div>
              
              <p style="margin-top: 30px; background: #f0f9ff; padding: 15px; border-left: 3px solid #0ea5e9; border-radius: 4px;">
                <strong>Next Steps:</strong><br/>
                Share this analysis with your CPA or financial advisor. Timing and tax law changes can significantly impact the optimal conversion strategy for your situation.
              </p>
              
              <a href="https://nestwise.biz" class="button">View Full Analysis</a>
            </div>
            
            <div class="footer">
              <p>This email contains your personalized analysis. Please keep it confidential and only share with your financial advisors.</p>
              <p>&copy; 2026 NestWise. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  taxUpdateNotification: (taxUpdate: string, affectedUsers: string) => ({
    subject: `⚠️ Tax Law Change Alert from NestWise`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; }
            .footer { text-align: center; padding: 20px 0; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Important Tax Law Update</h2>
            
            <div class="alert">
              <h3 style="margin-top: 0;">⚠️ ${taxUpdate}</h3>
              <p><strong>This affects:</strong> ${affectedUsers}</p>
            </div>
            
            <p>A recent change in tax law may impact your Roth conversion strategy. We recommend reviewing your plan with your financial advisor.</p>
            
<p>Log into NestWise to run an updated analysis with the latest tax assumptions.</p>

            <a href="https://nestwise.biz" class="button">Review Your Analysis</a>
            
            <div class="footer">
              <p>&copy; 2026 NestWise. Unsubscribe by replying to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `
  })
}

// Send advisor summary email
export async function sendAdvisorEmail(
  toEmail: string,
  userName: string,
  age: number,
  recommendedConversion: number,
  taxSavings: number,
  currentBracket: number,
  retirementBracket: number,
  rmdEst: number
) {
  if (!RESEND_API_KEY) {
    console.warn('Resend API key not configured')
    return false
  }

  try {
    const template = emailTemplates.advisorSummary(
      userName,
      age,
      recommendedConversion,
      taxSavings,
      currentBracket,
      retirementBracket,
      rmdEst
    )

    const result = await getResend().emails.send({
      from: 'NestWise <noreply@nestwise.biz>',
      to: toEmail,
      subject: template.subject,
      html: template.html,
    })

    return !result.error
  } catch (err) {
    console.error('Error sending advisor email:', err)
    return false
  }
}

// Send tax update notification
export async function sendTaxUpdateNotification(
  toEmails: string[],
  taxUpdate: string,
  affectedUsers: string
) {
  if (!RESEND_API_KEY) {
    console.warn('Resend API key not configured')
    return false
  }

  try {
    const template = emailTemplates.taxUpdateNotification(taxUpdate, affectedUsers)

    const result = await getResend().emails.send({
      from: 'NestWise <noreply@nestwise.biz>',
      to: toEmails,
      subject: template.subject,
      html: template.html,
    })

    return !result.error
  } catch (err) {
    console.error('Error sending tax update notification:', err)
    return false
  }
}
