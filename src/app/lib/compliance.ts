/**
 * Enhanced IRS Compliance & Tax Optimization Calculations
 * Addresses pro-rata rule, NUA, QCD, state rules, and IRMAA edge cases
 */

export interface ComplianceWarnings {
  requiresCpaReview: boolean
  proRatioRisk: boolean
  nuaOpportunity: boolean
  qcdOpportunity: boolean
  irmaaDetail: IrmaaBreakdown
  stateConversionRisk: boolean
  inheritedRothRisk: boolean
  conversionLadderEligible: boolean
  warnings: string[]
  recommendations: string[]
}

export interface IrmaaBreakdown {
  magi: number
  partBSurcharge: number
  partBMonthly: number
  partDSurcharge: number
  partDMonthly: number
  totalAnnualSurcharge: number
  affectedYears: number[]
}

// ─── Pro-Rata Rule Checker ────────────────────────────────────────────────────
/**
 * Pro-rata rule aggregates ALL IRAs (traditional, SEP, SIMPLE) to determine
 * how much of a conversion is taxable. This is CRITICAL and often missed.
 */
export function checkProRatioRisk(
  traditionalBalance: number,
  rothBalance: number,
  hasMultipleIras: boolean,
  nonDeductibleContributions: number
): {
  isAtRisk: boolean
  warning: string
  explanation: string
} {
  if (!hasMultipleIras || traditionalBalance === 0) {
    return {
      isAtRisk: false,
      warning: '',
      explanation:
        'Pro-rata rule applies only when you have multiple IRA accounts or non-deductible contributions.',
    }
  }

  // If you have non-deductible contributions (basis), conversions aren't pro-rata taxable
  const effectiveBasis =
    nonDeductibleContributions > 0 ? nonDeductibleContributions : 0
  const taxablePercent =
    (traditionalBalance - effectiveBasis) / (traditionalBalance + rothBalance)

  return {
    isAtRisk: taxablePercent > 0.3, // Over 30% taxable is significant
    warning:
      taxablePercent > 0.3
        ? `⚠️ Pro-Rata Risk: ~${Math.round(taxablePercent * 100)}% of your conversion will be taxable`
        : '',
    explanation: `You have multiple IRAs. The pro-rata rule aggregates them all. If you convert $100K and have $300K in pre-tax IRAs with $0 basis, you owe taxes on ~${Math.round((300 / 400) * 100)}% = ~$75K in taxes.`,
  }
}

// ─── NUA (Net Unrealized Appreciation) Optimizer ────────────────────────────
/**
 * If you have employer stock in your 401k, you can do a "NUA distribution" to avoid
 * the pro-rata rule AND defer gains taxes until sale. This is worth 100s of thousands.
 */
export function checkNuaOpportunity(
  employerStockInPlans: number,
  employerStockCostBasis: number
): {
  hasOpportunity: boolean
  potential30YearSavings: number
  explanation: string
} {
  if (employerStockInPlans === 0 || employerStockCostBasis === 0) {
    return {
      hasOpportunity: false,
      potential30YearSavings: 0,
      explanation:
        'NUA strategy only applies if you have employer stock in a 401k or similar plan.',
    }
  }

  const unrealizedGain = employerStockInPlans - employerStockCostBasis
  const capitalGainsTax = unrealizedGain * 0.15 // Long-term capital gains rate
  const ordinatoryIncomeTax = unrealizedGain * 0.32 // Rough average bracket

  const savings = ordinatoryIncomeTax - capitalGainsTax
  const compounded30Years = savings * Math.pow(1.08, 30) // 8% growth over 30 years

  return {
    hasOpportunity: unrealizedGain > 50000,
    potential30YearSavings: compounded30Years,
    explanation: `You have $${Math.round(unrealizedGain).toLocaleString()} in unrealized gains on employer stock. Using NUA, you pay capital gains tax (~15%) instead of ordinary income (~32%), saving $${Math.round(savings).toLocaleString()} immediately. Over 30 years: ~$${Math.round(compounded30Years).toLocaleString()}.`,
  }
}

// ─── QCD (Qualified Charitable Distribution) Optimizer ──────────────────────
/**
 * If you're 70½+ and charitably inclined, QCD lets you donate directly from your
 * IRA up to $105K/year without counting toward IRMAA or RMD.
 */
export function checkQcdOpportunity(
  age: number,
  traditionalBalance: number,
  charityGoals: number
): {
  eligible: boolean
  maxQcd: number
  explanation: string
} {
  if (age < 70) {
    return {
      eligible: false,
      maxQcd: 0,
      explanation: 'QCD (Qualified Charitable Distribution) starts at age 70½.',
    }
  }

  if (charityGoals === 0) {
    return {
      eligible: true,
      maxQcd: 105000,
      explanation:
        'You are eligible for QCD but may not have charity goals. Consider whether QCD aligns with your values.',
    }
  }

  const maxQcd = Math.min(105000, traditionalBalance)
  const irsReduction = Math.min(charityGoals, maxQcd)
  const irmaaImpactAvoidance = irsReduction * 0.32 // Rough tax benefit

  return {
    eligible: true,
    maxQcd,
    explanation: `QCD lets you give up to $${maxQcd.toLocaleString()}/year to charity directly from your IRA. This counts as a Roth conversion alternative—it reduces your MAGI/IRMAA by the donation amount, saving ~$${Math.round(irmaaImpactAvoidance).toLocaleString()} in taxes.`,
  }
}

// ─── Enhanced IRMAA Calculation with Actual Surcharges ──────────────────────
/**
 * Real IRMAA has multiple income thresholds and surcharges. This calculates
 * actual Medicare Part B and Part D surcharges year by year.
 */
export function calculateEnhancedIrmaa(
  age: number,
  magi: number,
  filing: 'single' | 'married',
  yearsInRetirement: number
): IrmaaBreakdown {
  // 2024 IRMAA brackets (updated annually)
  const brackets =
    filing === 'married'
      ? [
          { threshold: 206000, partB: 0, partD: 0 }, // No surcharge
          { threshold: 258000, partB: 65, partD: 12 },
          { threshold: 322000, partB: 160, partD: 31 },
          { threshold: 386000, partB: 240, partD: 50 },
          { threshold: 450000, partB: 320, partD: 69 },
          { threshold: 1e9, partB: 360, partD: 77 },
        ]
      : [
          { threshold: 103000, partB: 0, partD: 0 },
          { threshold: 129000, partB: 65, partD: 12 },
          { threshold: 161000, partB: 160, partD: 31 },
          { threshold: 193000, partB: 240, partD: 50 },
          { threshold: 225000, partB: 320, partD: 69 },
          { threshold: 1e9, partB: 360, partD: 77 },
        ]

  let partBSurcharge = 0
  let partDSurcharge = 0

  for (const bracket of brackets) {
    if (magi <= bracket.threshold) {
      partBSurcharge = bracket.partB
      partDSurcharge = bracket.partD
      break
    }
  }

  // Standard Medicare premiums (2024)
  const basePremiumB = 1750 * 12 // ~$1,750/month
  const basePremiumD = 35 * 12 // ~$35/month

  const partBMonthly = (basePremiumB + partBSurcharge * 12) / 12
  const partDMonthly = (basePremiumD + partDSurcharge * 12) / 12

  const totalAnnualSurcharge = partBSurcharge * 12 + partDSurcharge * 12

  // Project affected years (typically 2 years post-conversion due to MAGI lookback)
  const affectedYears: number[] = []
  for (let i = 0; i < 2; i++) {
    affectedYears.push(age + i)
  }

  return {
    magi,
    partBSurcharge,
    partBMonthly,
    partDSurcharge,
    partDMonthly,
    totalAnnualSurcharge,
    affectedYears,
  }
}

// ─── State-Specific Roth Rules ────────────────────────────────────────────────
/**
 * Some states don't recognize Roth conversions or impose additional tax.
 * Moving BEFORE conversion can save significant taxes.
 */
export function checkStateConversionRisk(
  currentState: string,
  conversionAmount: number,
  marginRate: number
): {
  hasRisk: boolean
  recommendation: string
  potentialSavings: number
} {
  // States that don't recognize Roth (taxation may still apply to conversion)
  const restrictiveStates = ['CA', 'NJ', 'NY', 'VT']

  if (!restrictiveStates.includes(currentState)) {
    return {
      hasRisk: false,
      recommendation: 'Your state generally allows Roth conversions without additional tax.',
      potentialSavings: 0,
    }
  }

  // Rough state tax on conversion
  const stateRate = 0.093 // CA rate
  const stateTaxCost = conversionAmount * stateRate
  const noStateTaxSavings = stateTaxCost

  return {
    hasRisk: true,
    recommendation: `Your state (${currentState}) has high income tax. Consider moving to a no-income-tax state (FL, TX, NV, WA) BEFORE your conversion. You could save $${Math.round(noStateTaxSavings).toLocaleString()} in state taxes.`,
    potentialSavings: noStateTaxSavings,
  }
}

// ─── Inherited Roth Account Logic ────────────────────────────────────────────
/**
 * SECURE 2.0 (2023) changed inherited Roth rules dramatically.
 * Non-spouse beneficiaries must now empty the account in 10 years (not RMD-based).
 */
export function checkInheritedRothStrategy(
  hasHeirs: boolean,
  age: number,
  yearsToRmd: number,
  rothBalance: number
): {
  relevant: boolean
  warning: string
  strategy: string
} {
  if (!hasHeirs || age < 55) {
    return {
      relevant: false,
      warning: '',
      strategy: 'Inherited Roth planning is relevant primarily for 55+ with heirs.',
    }
  }

  return {
    relevant: true,
    warning: `SECURE 2.0: Non-spouse heirs have 10 years to empty inherited Roths (no annual RMDs). This means if you leave a $1M Roth, heirs must withdraw $100K/year average. Plan for their tax bracket!`,
    strategy: `Instead of leaving large Roth balances, consider: (1) Converting more NOW so heirs get it tax-free, (2) Using Roth conversions to fund life insurance that pays heirs, (3) Charitable remainder trusts for large charitable gifts.`,
  }
}

// ─── Conversion Ladder Eligibility ────────────────────────────────────────────
/**
 * Roth conversion ladders allow sub-59½ early access via the 5-year rule.
 * Each conversion ladder has its own 5-year tracking.
 */
export function checkConversionLadderEligibility(
  age: number,
  yearsToRetire: number
): {
  eligible: boolean
  explanation: string
} {
  if (age >= 59.5) {
    return {
      eligible: false,
      explanation: 'Conversion ladder not needed—you can withdraw from Roth penalty-free.',
    }
  }

  if (yearsToRetire < 5) {
    return {
      eligible: true,
      explanation: `Conversion ladder: Convert in year 1, wait 5 years (until age ${Math.round(age + 5)}), then withdraw penalty-free. Each ladder is separate, so layered conversions create layered withdrawals.`,
    }
  }

  return {
    eligible: true,
    explanation: `You could use conversion ladders if early retirement is on the table. Each $100K conversion creates a tax bill now but penalty-free access in 5 years.`,
  }
}

// ─── Master Compliance Report ─────────────────────────────────────────────────
export function generateComplianceReport(
  age: number,
  filing: 'single' | 'married',
  traditionalBalance: number,
  rothBalance: number,
  conversionAmount: number,
  magi: number,
  yearsToRmd: number,
  yearsInRetirement: number,
  hasMultipleIras: boolean,
  nonDeductibleContributions: number,
  employerStockInPlans: number,
  employerStockCostBasis: number,
  charityGoals: number,
  currentState: string,
  hasHeirs: boolean,
  marginRate: number,
  yearsToRetire: number
): ComplianceWarnings {
  const warnings: string[] = []
  const recommendations: string[] = []
  let requiresCpaReview = false

  // Check 1: Pro-Ratio Rule
  const proRatio = checkProRatioRisk(
    traditionalBalance,
    rothBalance,
    hasMultipleIras,
    nonDeductibleContributions
  )
  if (proRatio.isAtRisk) {
    warnings.push(proRatio.warning)
    requiresCpaReview = true
  }

  // Check 2: NUA Opportunity
  const nua = checkNuaOpportunity(employerStockInPlans, employerStockCostBasis)
  if (nua.hasOpportunity) {
    recommendations.push(
      `NUA Opportunity: ${nua.explanation} This requires your CPA's coordination with your plan.`
    )
    requiresCpaReview = true
  }

  // Check 3: QCD Opportunity
  const qcd = checkQcdOpportunity(age, traditionalBalance, charityGoals)
  if (qcd.eligible && charityGoals > 0) {
    recommendations.push(`QCD Strategy: ${qcd.explanation}`)
  }

  // Check 4: IRMAA Detail
  const irmaa = calculateEnhancedIrmaa(age, magi, filing, yearsInRetirement)
  if (irmaa.totalAnnualSurcharge > 500) {
    warnings.push(
      `Medicare Surcharges: Your estimated MAGI will trigger $${Math.round(irmaa.totalAnnualSurcharge).toLocaleString()}/year in IRMAA surcharges.`
    )
  }

  // Check 5: State Rules
  const state = checkStateConversionRisk(currentState, conversionAmount, marginRate)
  if (state.hasRisk) {
    warnings.push(state.recommendation)
    recommendations.push(
      `State Planning: Consider relocating to ${['FL', 'TX', 'NV', 'WA'].join('/')}.`
    )
  }

  // Check 6: Inherited Roth
  const inherited = checkInheritedRothStrategy(hasHeirs, age, yearsToRmd, rothBalance)
  if (inherited.relevant) {
    recommendations.push(inherited.strategy)
  }

  // Check 7: Conversion Ladder
  const ladder = checkConversionLadderEligibility(age, yearsToRetire)

  // Large conversions need CPA review
  if (conversionAmount > 100000) {
    requiresCpaReview = true
    warnings.push(
      `Large Conversion Alert: $${conversionAmount.toLocaleString()} conversions require CPA coordination for pro-rata rules, IRMAA impact, and state tax optimization.`
    )
  }

  return {
    requiresCpaReview,
    proRatioRisk: proRatio.isAtRisk,
    nuaOpportunity: nua.hasOpportunity,
    qcdOpportunity: qcd.eligible && charityGoals > 0,
    irmaaDetail: irmaa,
    stateConversionRisk: state.hasRisk,
    inheritedRothRisk: inherited.relevant,
    conversionLadderEligible: ladder.eligible,
    warnings,
    recommendations,
  }
}
