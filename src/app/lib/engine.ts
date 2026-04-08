// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionState {
  age: number
  spouseAge: number
  filing: 'single' | 'married'
  trad: number
  roth: number
  taxable: number
  annualIncome: number
  pensionSSI: number
  bracket: number
  stateRate: number
  withdrawalRate: number
  expectedReturn: number
  yearsInRetirement: number
  inflationRate: number
  conversionAmount: number
  longTermCareFlag: boolean
  medicareFlag: boolean
  heirFlag: boolean
  ssEarnings: number
  currentPage: number
  // Compliance fields (optional, for enhanced IRS alignment)
  hasMultipleIras?: boolean
  nonDeductibleContributions?: number
  employerStockInPlans?: number
  employerStockCostBasis?: number
  charityGoals?: number
  currentState?: string
  yearsToRetire?: number
}

export interface Session {
  id: string
  version: number
  name: string
  createdAt: number
  updatedAt: number
  state: SessionState
  chatHistory: ChatMessage[]
  chatInitialized: boolean
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ScheduleRow {
  yr: number
  conv: number
  taxCost: number
  tradBal: number
  rothBal: number
  margRate: number
}

export interface Analysis {
  score: number
  margNow: number
  margLater: number
  taxDelta: number
  irmaaRisk: boolean
  rmdEst: number
  yearsToRMD: number
  optConv: number
  schedule: ScheduleRow[]
  labels: string[]
  tVals: number[]
  rVals: number[]
  rmdVals: number[]
  ss62: number
  ss67: number
  ss70: number
  be6267: number
  be6770: number
  lt62: number
  lt67: number
  lt70: number
  ssRec: number | 'now'
  ssRecReason: string
  irmaaT: number
  // pass-through from state for convenience
  trad: number
  roth: number
  taxable: number
  ret: number
  st: number
  filing: string
  stateRate: number
  heirFlag: boolean
  medicareFlag: boolean
  longTermCareFlag: boolean
  age: number
  pensionSSI: number
  annualIncome: number
  yearsInRetirement: number
  expectedReturn: number
  conversionAmount: number
  // Compliance/regulatory data
  complianceWarnings?: string[]
  complianceRecommendations?: string[]
  requiresCpaReview?: boolean
  irmaaDetail?: {
    magi: number
    partBSurcharge: number
    partDSurcharge: number
    totalAnnualSurcharge: number
  }
}

// ─── 2024 Tax Brackets ────────────────────────────────────────────────────────

const BRACKETS: Record<string, Array<{ r: number; u: number }>> = {
  single: [
    { r: 10, u: 11600 },
    { r: 12, u: 47150 },
    { r: 22, u: 100525 },
    { r: 24, u: 191950 },
    { r: 32, u: 243725 },
    { r: 35, u: 609350 },
    { r: 37, u: 1e9 },
  ],
  married: [
    { r: 10, u: 23200 },
    { r: 12, u: 94300 },
    { r: 22, u: 201050 },
    { r: 24, u: 383900 },
    { r: 32, u: 487450 },
    { r: 35, u: 731200 },
    { r: 37, u: 1e9 },
  ],
}

// ─── Tax Calculation Helpers ──────────────────────────────────────────────────

export function calcTax(income: number, filing: string): number {
  const brackets = BRACKETS[filing] ?? BRACKETS.single
  let tax = 0
  let prev = 0
  for (const { r, u } of brackets) {
    const chunk = Math.max(0, Math.min(income, u) - prev)
    tax += chunk * (r / 100)
    prev = u
    if (income <= u) break
  }
  return tax
}

export function marginalRate(income: number, filing: string): number {
  const brackets = BRACKETS[filing] ?? BRACKETS.single
  for (const { r, u } of brackets) {
    if (income <= u) return r
  }
  return 37
}

export function topOfBracket(income: number, filing: string): number {
  const brackets = BRACKETS[filing] ?? BRACKETS.single
  for (const { r, u } of brackets) {
    if (income <= u) return u
  }
  return 1e9
}

// ─── Main Analysis Engine ─────────────────────────────────────────────────────

import { generateComplianceReport, calculateEnhancedIrmaa } from './compliance'

export function analyze(s: SessionState): Analysis {
  const ret = s.expectedReturn / 100
  const st = s.stateRate / 100
  const wr = s.withdrawalRate / 100

  const yearsToRMD = Math.max(0, 73 - s.age)
  const totalSav = s.trad + s.roth + s.taxable
  const annWd = totalSav * wr
  const baseInc = s.annualIncome + s.pensionSSI

  const margNow = marginalRate(baseInc + (s.conversionAmount || 0), s.filing)
  const topBk = topOfBracket(baseInc, s.filing)
  const optConv = Math.max(0, topBk - baseInc) * 0.95
  const retInc = Math.max(s.pensionSSI, annWd * 0.6)
  const rmdEst =
    yearsToRMD > 0
      ? (s.trad * Math.pow(1 + ret, yearsToRMD)) / 27.4
      : s.trad / 26.5

  const margLater = marginalRate(retInc + rmdEst * 0.5, s.filing)
  const taxDelta =
    (margLater / 100 + st - (margNow / 100 + st)) * (s.conversionAmount || 0)

  const irmaaT = s.filing === 'married' ? 206000 : 103000
  const irmaaRisk = retInc + rmdEst > irmaaT

  const score =
    (taxDelta > 0 ? 30 : 0) +
    (yearsToRMD >= 3 ? 20 : 0) +
    (s.taxable > (s.conversionAmount || 0) * (margNow / 100 + st) * 5 ? 15 : 0) +
    (irmaaRisk ? 15 : 0) +
    (s.heirFlag ? 10 : 0) +
    (margNow < margLater ? 10 : 0)

  // Conversion schedule
  const convYears = Math.min(yearsToRMD || 1, 15)
  const schedule: ScheduleRow[] = []
  let pt = s.trad
  let pr = s.roth
  let tx = s.taxable

  for (let y = 1; y <= convYears; y++) {
    const top = topOfBracket(baseInc, s.filing)
    const conv = Math.min(Math.max(0, top - baseInc) * 0.95, pt)
    const taxCost =
      calcTax(baseInc + conv, s.filing) - calcTax(baseInc, s.filing) + conv * st
    pt = Math.max(0, pt - conv) * (1 + ret)
    pr = (pr + conv) * (1 + ret)
    tx = Math.max(0, (tx - Math.min(taxCost, tx)) * (1 + ret))
    schedule.push({
      yr: s.age + y - 1,
      conv: Math.round(conv),
      taxCost: Math.round(taxCost),
      tradBal: Math.round(pt),
      rothBal: Math.round(pr),
      margRate: marginalRate(baseInc + conv, s.filing),
    })
  }

  // Chart projection
  const labels: string[] = []
  const tVals: number[] = []
  const rVals: number[] = []
  const rmdVals: number[] = []
  let pt2 = s.trad
  let pr2 = s.roth

  for (let y = 0; y <= s.yearsInRetirement; y++) {
    const cAge = s.age + y
    if (y < convYears) {
      const c = Math.min(optConv, pt2)
      pt2 = Math.max(0, pt2 - c) * (1 + ret)
      pr2 = (pr2 + c) * (1 + ret)
    } else {
      pt2 *= 1 + ret
      pr2 *= 1 + ret
    }
    const rmd = cAge >= 73 ? pt2 / Math.max(1, 27.4 - (cAge - 73)) : 0
    labels.push(String(cAge))
    tVals.push(Math.round(pt2))
    rVals.push(Math.round(pr2))
    rmdVals.push(Math.round(rmd))
  }

  // Social Security
  const ss = s.ssEarnings || 2000
  const ss62 = Math.round(ss * 0.7)
  const ss67 = Math.round(ss)
  const ss70 = Math.round(ss * 1.24)
  const lifetime = (startAge: number, monthly: number) =>
    monthly * 12 * Math.max(0, 90 - startAge)
  const be6267 = Math.round(62 + (ss67 * 12 * 5) / ((ss67 - ss62) * 12))
  const be6770 = Math.round(67 + (ss67 * 12 * 5) / ((ss70 - ss67) * 12))

  let ssRec: number | 'now' = 67
  let ssRecReason =
    'Full retirement age (67) gives the best balance of monthly income and long-term value for your situation.'
  if (s.age < 64 && s.trad > 400000) {
    ssRec = 70
    ssRecReason =
      'Your large traditional balance creates maximum bracket room during the delay years. Convert aggressively while delaying SS — you get a lower tax bill now and a 24% higher SS payment for life.'
  } else if (s.age >= 68) {
    ssRec = 'now'
    ssRecReason =
      'The break-even math has largely closed. Claiming now captures the most remaining lifetime value.'
  } else if (s.heirFlag) {
    ssRec = 67
    ssRecReason =
      'Delaying to full retirement age (67) balances your monthly income with leaving more assets intact for heirs.'
  }

  return {
    score,
    margNow,
    margLater,
    taxDelta,
    irmaaRisk,
    rmdEst,
    yearsToRMD,
    optConv,
    schedule,
    labels,
    tVals,
    rVals,
    rmdVals,
    ss62,
    ss67,
    ss70,
    be6267,
    be6770,
    lt62: lifetime(62, ss62),
    lt67: lifetime(67, ss67),
    lt70: lifetime(70, ss70),
    ssRec,
    ssRecReason,
    irmaaT,
    trad: s.trad,
    roth: s.roth,
    taxable: s.taxable,
    ret,
    st,
    filing: s.filing,
    stateRate: s.stateRate,
    heirFlag: s.heirFlag,
    medicareFlag: s.medicareFlag,
    longTermCareFlag: s.longTermCareFlag,
    age: s.age,
    pensionSSI: s.pensionSSI,
    annualIncome: s.annualIncome,
    yearsInRetirement: s.yearsInRetirement,
    expectedReturn: s.expectedReturn,
    conversionAmount: s.conversionAmount || 0,
    ...(() => {
      // Generate compliance report
      const report = generateComplianceReport(
        s.age,
        s.filing,
        s.trad,
        s.roth,
        s.conversionAmount || 0,
        s.annualIncome + s.pensionSSI, // MAGI
        yearsToRMD,
        s.yearsInRetirement,
        s.hasMultipleIras ?? false,
        s.nonDeductibleContributions ?? 0,
        s.employerStockInPlans ?? 0,
        s.employerStockCostBasis ?? 0,
        s.charityGoals ?? 0,
        s.currentState ?? 'CA', // Default to CA as conservative estimate
        s.heirFlag ?? false,
        margNow,
        s.yearsToRetire ?? 0
      )

      const irmaaDetail = calculateEnhancedIrmaa(
        s.age,
        s.annualIncome + s.pensionSSI + (s.conversionAmount || 0) * 0.5,
        s.filing,
        s.yearsInRetirement
      )

      return {
        complianceWarnings: report.warnings,
        complianceRecommendations: report.recommendations,
        requiresCpaReview: report.requiresCpaReview,
        irmaaDetail: {
          magi: irmaaDetail.magi,
          partBSurcharge: irmaaDetail.partBSurcharge,
          partDSurcharge: irmaaDetail.partDSurcharge,
          totalAnnualSurcharge: irmaaDetail.totalAnnualSurcharge,
        },
      }
    })(),
  }
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export const fmt = (n: number) => '$' + Math.round(n).toLocaleString()
export const fmtK = (n: number) => '$' + Math.round(n / 1000) + 'K'
