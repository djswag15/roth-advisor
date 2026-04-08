import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Roth Conversion Advisor',
  description:
    'Personalized Roth conversion analysis — optimize your tax bracket, plan your conversion schedule, and model Social Security timing.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: 'Roth Conversion Advisor',
    description: 'AI-powered Roth conversion planning for people nearing retirement.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
