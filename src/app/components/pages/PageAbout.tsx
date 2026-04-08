'use client'
import type { SessionState } from '@/app/lib/engine'

interface PageProps {
  state: SessionState
  onUpdate: (patch: Partial<SessionState>) => void
}

// ── Shared field wrapper ──────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string | React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 1 — About you
// ─────────────────────────────────────────────────────────────────────────────
export function PageAbout({ state, onUpdate }: PageProps) {
  return (
    <>
      <div className="pg-title" style={{ fontSize: 22, fontWeight: 500, marginBottom: '.3rem' }}>Tell us about yourself</div>
      <div style={{ fontSize: 15, color: '#666', marginBottom: '1.25rem', lineHeight: 1.5 }}>
        This helps us personalize every recommendation for your specific situation.
      </div>
      <div className="card">
        <div className="row2">
          <Field label="Your current age" hint="Determines when Required Minimum Distributions start (age 73) and shapes your whole conversion strategy">
            <input type="number" min={40} max={85} value={state.age} onChange={e => onUpdate({ age: +e.target.value })} />
          </Field>
          <Field label={<>Spouse's age <span style={{ fontWeight: 400, fontSize: 13 }}>(Enter 0 if no spouse)</span></>}>
            <input type="number" min={0} max={85} value={state.spouseAge} onChange={e => onUpdate({ spouseAge: +e.target.value })} />
          </Field>
        </div>
        <Field label="How do you file your taxes?">
          <select value={state.filing} onChange={e => onUpdate({ filing: e.target.value as 'single' | 'married' })}>
            <option value="single">Single</option>
            <option value="married">Married filing jointly</option>
          </select>
        </Field>
        <div className="row3">
          <Field label={<span style={{ fontSize: 13 }}>Concerned about long-term care costs?</span>}>
            <select value={state.longTermCareFlag ? 'yes' : 'no'} onChange={e => onUpdate({ longTermCareFlag: e.target.value === 'yes' })}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </Field>
          <Field label={<span style={{ fontSize: 13 }}>Leaving money to children or heirs?</span>}>
            <select value={state.heirFlag ? 'yes' : 'no'} onChange={e => onUpdate({ heirFlag: e.target.value === 'yes' })}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </Field>
          <Field label={<span style={{ fontSize: 13 }}>Concerned about Medicare costs?</span>}>
            <select value={state.medicareFlag ? 'yes' : 'no'} onChange={e => onUpdate({ medicareFlag: e.target.value === 'yes' })}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </Field>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 2 — Savings
// ─────────────────────────────────────────────────────────────────────────────
export function PageSavings({ state, onUpdate }: PageProps) {
  return (
    <>
      <div style={{ fontSize: 22, fontWeight: 500, marginBottom: '.3rem' }}>Your savings accounts</div>
      <div style={{ fontSize: 15, color: '#666', marginBottom: '1.25rem', lineHeight: 1.5 }}>
        Enter your best estimates — you can always come back and update these.
      </div>
      <div className="card">
        <div className="row2">
          <Field label="Traditional IRA or 401(k) ($)" hint="Money you haven't paid taxes on yet — most workplace 401(k)s and traditional IRAs fall here">
            <input type="number" min={0} value={state.trad} onChange={e => onUpdate({ trad: +e.target.value })} />
          </Field>
          <Field label="Roth IRA or Roth 401(k) ($)" hint="Money you've already paid taxes on — grows and comes out tax-free forever">
            <input type="number" min={0} value={state.roth} onChange={e => onUpdate({ roth: +e.target.value })} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Taxable brokerage account ($)" hint="A regular investment account outside an IRA. This is the ideal source to pay conversion taxes — keeps your IRA compounding intact">
            <input type="number" min={0} value={state.taxable} onChange={e => onUpdate({ taxable: +e.target.value })} />
          </Field>
          <Field label="Expected annual investment return (%)" hint="A balanced portfolio has averaged 6–7% historically. Be conservative here — better to be pleasantly surprised">
            <input type="number" min={1} max={15} step={0.5} value={state.expectedReturn} onChange={e => onUpdate({ expectedReturn: +e.target.value })} />
          </Field>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 3 — Income
// ─────────────────────────────────────────────────────────────────────────────
export function PageIncome({ state, onUpdate }: PageProps) {
  const brackets = [10, 12, 22, 24, 32, 35, 37]
  return (
    <>
      <div style={{ fontSize: 22, fontWeight: 500, marginBottom: '.3rem' }}>Your income picture</div>
      <div style={{ fontSize: 15, color: '#666', marginBottom: '1.25rem', lineHeight: 1.5 }}>
        We use this to find your current tax bracket and calculate how much room you have for conversions each year.
      </div>
      <div className="card">
        <div className="row2">
          <Field label="Annual income (wages, freelance, rental) ($)">
            <input type="number" min={0} value={state.annualIncome} onChange={e => onUpdate({ annualIncome: +e.target.value })} />
          </Field>
          <Field label="Pension or annuity income per year ($)" hint="Do not include Social Security here — we handle that separately below">
            <input type="number" min={0} value={state.pensionSSI} onChange={e => onUpdate({ pensionSSI: +e.target.value })} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Your federal tax bracket" hint="Not sure? Check line 16 of your most recent Form 1040">
            <select value={state.bracket} onChange={e => onUpdate({ bracket: +e.target.value })}>
              {brackets.map(r => <option key={r} value={r}>{r}% bracket</option>)}
            </select>
          </Field>
          <Field label="State income tax rate (%)" hint="Nine states (FL, TX, NV, WY, WA, SD, AK, NH, TN) have no income tax on most retirement income">
            <input type="number" min={0} max={15} step={0.5} value={state.stateRate} onChange={e => onUpdate({ stateRate: +e.target.value })} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Estimated monthly Social Security benefit ($)" hint="Find your personalized estimate at ssa.gov/myaccount — use the amount shown for age 67 (full retirement age)">
            <input type="number" min={0} value={state.ssEarnings} onChange={e => onUpdate({ ssEarnings: +e.target.value })} />
          </Field>
          <div />
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 4 — Goals
// ─────────────────────────────────────────────────────────────────────────────
export function PageGoals({ state, onUpdate }: PageProps) {
  return (
    <>
      <div style={{ fontSize: 22, fontWeight: 500, marginBottom: '.3rem' }}>Your retirement goals</div>
      <div style={{ fontSize: 15, color: '#666', marginBottom: '1.25rem', lineHeight: 1.5 }}>
        Help us understand how you plan to use your money in retirement — this shapes the entire strategy.
      </div>
      <div className="card">
        <div className="row2">
          <Field label="How much of your savings to withdraw each year? (%)" hint="The classic '4% rule' is a common starting point. Using 3–3.5% gives more cushion for a 30+ year retirement">
            <input type="number" min={1} max={10} step={0.5} value={state.withdrawalRate} onChange={e => onUpdate({ withdrawalRate: +e.target.value })} />
          </Field>
          <Field label="How many years do you expect to be retired?" hint="When in doubt, plan longer. A 65-year-old today has a 50% chance of living past age 85">
            <input type="number" min={10} max={50} value={state.yearsInRetirement} onChange={e => onUpdate({ yearsInRetirement: +e.target.value })} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Inflation estimate (%)" hint="Historically around 3%. Healthcare inflation runs higher — 4–5% is realistic for medical expenses in retirement">
            <input type="number" min={1} max={8} step={0.5} value={state.inflationRate} onChange={e => onUpdate({ inflationRate: +e.target.value })} />
          </Field>
          <Field label="How much do you want to convert per year? ($)" hint="Our analysis will show you the ideal amount to stay within your current tax bracket — the key to doing this efficiently">
            <input type="number" min={0} value={state.conversionAmount} onChange={e => onUpdate({ conversionAmount: +e.target.value })} />
          </Field>
        </div>
      </div>
    </>
  )
}

export default PageAbout
