import type { SessionState, Analysis } from './engine'
import { analyze } from './engine'

export interface Scenario {
  id: 'primary' | 'comparison'
  label: string
  conversionAmount: number
  analysis: Analysis
}

export function createScenario(state: SessionState, id: 'primary' | 'comparison', label: string): Scenario {
  const modifiedState = { ...state, conversionAmount: state.conversionAmount }
  const analysis = analyze(modifiedState)
  return { id, label, conversionAmount: state.conversionAmount, analysis }
}

export function compareScenarios(scenario1: Analysis, scenario2: Analysis) {
  return {
    taxDeltaDiff: scenario2.taxDelta - scenario1.taxDelta,
    rmdDiff: scenario2.rmdEst - scenario1.rmdEst,
    scheduleLength: Math.max(scenario1.schedule.length, scenario2.schedule.length),
    conversionDiff: (scenario2.schedule[0]?.conv || 0) - (scenario1.schedule[0]?.conv || 0),
    balanceDiff: {
      trad: scenario2.schedule[0]?.tradBal - scenario1.schedule[0]?.tradBal,
      roth: scenario2.schedule[0]?.rothBal - scenario1.schedule[0]?.rothBal,
    }
  }
}

// Format for comparison table
export function getComparisonMetrics(s1: Analysis, s2: Analysis) {
  return [
    { metric: 'Recommended annual conversion', s1: s1.optConv, s2: s2.optConv },
    { metric: 'Tax savings (30 years)', s1: s1.taxDelta, s2: s2.taxDelta },
    { metric: 'Est. first RMD', s1: s1.rmdEst, s2: s2.rmdEst },
    { metric: 'Years before RMD', s1: s1.yearsToRMD, s2: s2.yearsToRMD },
    { metric: 'Your bracket now', s1: s1.margNow, s2: s2.margNow },
    { metric: 'Est. retirement bracket', s1: s1.margLater, s2: s2.margLater },
  ]
}
