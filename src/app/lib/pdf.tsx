import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { SessionState, Analysis } from './engine'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingBottom: 5,
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  label: {
    color: '#6b7280',
    width: '50%',
  },
  value: {
    fontWeight: 'bold',
    color: '#111827',
    width: '50%',
    textAlign: 'right',
  },
  highlight: {
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  table: {
    display: 'flex',
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 15,
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
    color: '#1f2937',
  },
  tableCell: {
    flex: 1,
    padding: 6,
    fontSize: 10,
  },
  footer: {
    marginTop: 30,
    fontSize: 9,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
})

interface PDFProps {
  state: SessionState
  analysis: Analysis
}

export const NestWisePDF = ({ state, analysis }: PDFProps) => {
  const formatCurrency = (val: number) => `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`

  const recommendationReason = () => {
    const delta = analysis.margNow - analysis.margLater
    if (delta < 0) {
      return `Your expected tax rate will be lower in retirement (${formatPercent(analysis.margLater)} vs ${formatPercent(analysis.margNow)} now). Converting now at a lower rate locks in tax savings.`
    } else if (delta > 0) {
      return `Your expected tax rate will be higher in retirement (${formatPercent(analysis.margLater)} vs ${formatPercent(analysis.margNow)} now). Consider delaying conversions.`
    }
    return 'Your tax rates are expected to be similar in retirement and now.'
  }

  const ssRecommendation = () => {
    if (analysis.ssRec === 'now') {
      return `Claim now at 62. Monthly benefit: ${formatCurrency(analysis.ss62)}`
    }
    if (analysis.ssRec === 70) {
      return `Delay to 70 for maximum benefit: ${formatCurrency(analysis.ss70)} monthly (${formatCurrency(analysis.be6770)} more over lifetime vs 67).`
    }
    return `Claim at 67. Monthly benefit: ${formatCurrency(analysis.ss67)}`
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Roth Conversion Analysis — NestWise</Text>
          <Text style={styles.subtitle}>Personal Retirement Strategy Report</Text>
          <Text style={styles.subtitle}>
            Generated: {new Date().toLocaleDateString()} • Age {state.age}
            {state.spouseAge > 0 && ` (Spouse: ${state.spouseAge})`}
          </Text>
        </View>

        {/* Your Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Financial Profile</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Age:</Text>
            <Text style={styles.value}>{state.age}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Filing Status:</Text>
            <Text style={styles.value}>{state.filing === 'married' ? 'Married' : 'Single'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Current Tax Bracket:</Text>
            <Text style={styles.value}>{state.bracket}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>State Tax Rate:</Text>
            <Text style={styles.value}>{state.stateRate}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Annual Income:</Text>
            <Text style={styles.value}>{formatCurrency(state.annualIncome)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Pension/SSI:</Text>
            <Text style={styles.value}>{formatCurrency(state.pensionSSI)}</Text>
          </View>
        </View>

        {/* Current Assets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Assets</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Traditional IRA:</Text>
            <Text style={styles.value}>{formatCurrency(state.trad)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Roth IRA:</Text>
            <Text style={styles.value}>{formatCurrency(state.roth)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Taxable Accounts:</Text>
            <Text style={styles.value}>{formatCurrency(state.taxable)}</Text>
          </View>
        </View>

        {/* Recommendation Box */}
        <View style={styles.section}>
          <View style={styles.highlight}>
            <Text style={{ fontWeight: 'bold', color: '#92400e', marginBottom: 8 }}>
              Recommended Annual Roth Conversion
            </Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 }}>
              {formatCurrency(analysis.optConv)}
            </Text>
            <Text style={{ color: '#6b7280', fontSize: 10 }}>
              {recommendationReason()}
            </Text>
          </View>
        </View>

        {/* Tax Analysis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tax Impact Analysis</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Current Marginal Rate:</Text>
            <Text style={styles.value}>{formatPercent(analysis.margNow)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Expected Retirement Rate:</Text>
            <Text style={styles.value}>{formatPercent(analysis.margLater)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tax Delta (Savings Potential):</Text>
            <Text style={styles.value}>{formatCurrency(analysis.taxDelta)}</Text>
          </View>
          {analysis.irmaaRisk && (
            <View style={{ backgroundColor: '#fee2e2', padding: 8, marginTop: 10 }}>
              <Text style={{ color: '#991b1b', fontWeight: 'bold', fontSize: 10 }}>
                ⚠ IRMAA Risk Detected: Large conversions may trigger Medicare premium increases
              </Text>
            </View>
          )}
        </View>

        {/* Social Security Recommendation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social Security Strategy</Text>
          <Text style={{ color: '#1f2937', marginBottom: 10 }}>
            {ssRecommendation()}
          </Text>
          <View style={styles.row}>
            <Text style={styles.label}>Claim at 62:</Text>
            <Text style={styles.value}>{formatCurrency(analysis.ss62)}/month</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Claim at 67 (FRA):</Text>
            <Text style={styles.value}>{formatCurrency(analysis.ss67)}/month</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Claim at 70:</Text>
            <Text style={styles.value}>{formatCurrency(analysis.ss70)}/month</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This report is for informational purposes only and should not be considered financial advice.
            Please consult with a qualified financial advisor or tax professional before making any decisions.
          </Text>
        </View>
      </Page>

      {/* Conversion Schedule Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Recommended Conversion Schedule</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5-Year Projection</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>Year</Text>
              <Text style={styles.tableCell}>Conversion</Text>
              <Text style={styles.tableCell}>Tax Cost</Text>
              <Text style={styles.tableCell}>Trad Bal</Text>
              <Text style={styles.tableCell}>Roth Bal</Text>
            </View>
            {analysis.schedule.slice(0, 5).map((row, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.tableCell}>{row.yr}</Text>
                <Text style={styles.tableCell}>{formatCurrency(row.conv)}</Text>
                <Text style={styles.tableCell}>{formatCurrency(row.taxCost)}</Text>
                <Text style={styles.tableCell}>{formatCurrency(row.tradBal)}</Text>
                <Text style={styles.tableCell}>{formatCurrency(row.rothBal)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* RMD Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Minimum Distributions (RMD)</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Years Until RMD Begins:</Text>
            <Text style={styles.value}>{analysis.yearsToRMD}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Estimated First RMD:</Text>
            <Text style={styles.value}>{formatCurrency(analysis.rmdEst)}</Text>
          </View>
          <Text style={{ color: '#6b7280', fontSize: 10, marginTop: 10 }}>
            Converting to Roth reduces future RMD obligations, providing more flexibility in retirement.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>
            Assumptions: {state.expectedReturn}% annual return, {state.inflationRate}% inflation,
            {state.yearsInRetirement} years in retirement
          </Text>
        </View>
      </Page>
    </Document>
  )
}

// Helper to generate PDF blob
export async function generatePDFBlob(state: SessionState, analysis: Analysis): Promise<Blob> {
  const PDFDoc = NestWisePDF({ state, analysis })
  // @ts-ignore - react-pdf types are incomplete
  return await PDFDoc.toBlob()
}
