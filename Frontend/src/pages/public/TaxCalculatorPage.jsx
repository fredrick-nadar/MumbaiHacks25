"use client"

import React, { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Calculator,
  GaugeCircle,
  LineChart,
  ShieldCheck,
  Sparkle,
  TrendingUp,
  ChevronLeft,
} from "lucide-react"

import { Button } from "../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import LogoBadge from "../../components/logo"
import { useBranding } from "../../contexts/BrandingContext"
import { cn } from "../../lib/utils"

// --- Utility Functions ---

const parseNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "")
    const numeric = cleaned ? Number(cleaned) : 0
    return Number.isFinite(numeric) ? numeric : 0
  }
  return 0
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const formatCurrency = (value) => `₹${Math.round(Math.max(0, value)).toLocaleString()}`

const oldRegimeSlabs = [
  { upto: 250000, rate: 0 },
  { upto: 500000, rate: 0.05 },
  { upto: 1000000, rate: 0.2 },
  { upto: Infinity, rate: 0.3 },
]

const newRegimeSlabs = [
  { upto: 300000, rate: 0 },
  { upto: 600000, rate: 0.05 },
  { upto: 900000, rate: 0.1 },
  { upto: 1200000, rate: 0.15 },
  { upto: 1500000, rate: 0.2 },
  { upto: Infinity, rate: 0.3 },
]

const calculateTaxFromSlabs = (taxableIncome, slabs) => {
  let remaining = taxableIncome
  let previousCap = 0
  let tax = 0

  for (const slab of slabs) {
    if (remaining <= 0) break
    const span = Math.min(remaining, slab.upto - previousCap)
    if (span > 0) {
      tax += span * slab.rate
      remaining -= span
    }
    previousCap = slab.upto
  }

  return Math.max(0, tax)
}

const computeOldRegime = (inputs) => {
  const salary = Math.max(0, parseNumber(inputs.salary))
  const otherIncome = Math.max(0, parseNumber(inputs.otherIncome))
  const gross = salary + otherIncome
  const standardDeduction = salary > 0 ? 50000 : 0
  const deduction80C = Math.min(150000, Math.max(0, parseNumber(inputs.deduction80C)))
  const deduction80D = Math.min(75000, Math.max(0, parseNumber(inputs.deduction80D)))
  const housingInterest = Math.min(200000, Math.max(0, parseNumber(inputs.housingInterest)))
  const otherDeductions = Math.max(0, parseNumber(inputs.otherDeductions))

  const totalDeductions = standardDeduction + deduction80C + deduction80D + housingInterest + otherDeductions
  const taxableIncome = Math.max(0, gross - totalDeductions)

  let taxBeforeRebate = calculateTaxFromSlabs(taxableIncome, oldRegimeSlabs)
  if (taxableIncome <= 500000) {
    taxBeforeRebate = 0
  }
  const cess = taxBeforeRebate * 0.04
  const taxPayable = taxBeforeRebate + cess
  const effectiveRate = gross > 0 ? (taxPayable / gross) * 100 : 0

  return {
    regime: "Old",
    gross,
    totalDeductions,
    taxableIncome,
    taxBeforeCess: taxBeforeRebate,
    cess,
    taxPayable,
    effectiveRate,
  }
}

const computeNewRegime = (inputs) => {
  const salary = Math.max(0, parseNumber(inputs.salary))
  const otherIncome = Math.max(0, parseNumber(inputs.otherIncome))
  const gross = salary + otherIncome
  const standardDeduction = salary > 0 ? 50000 : 0

  const taxableIncome = Math.max(0, gross - standardDeduction)

  let taxBeforeRebate = calculateTaxFromSlabs(taxableIncome, newRegimeSlabs)
  if (taxableIncome <= 700000) {
    taxBeforeRebate = 0
  }
  const cess = taxBeforeRebate * 0.04
  const taxPayable = taxBeforeRebate + cess
  const effectiveRate = gross > 0 ? (taxPayable / gross) * 100 : 0

  return {
    regime: "New",
    gross,
    totalDeductions: standardDeduction,
    taxableIncome,
    taxBeforeCess: taxBeforeRebate,
    cess,
    taxPayable,
    effectiveRate,
  }
}

const computeCibilScore = (inputs) => {
  const creditLimit = Math.max(0, parseNumber(inputs.totalCreditLimit))
  const outstanding = Math.max(0, parseNumber(inputs.currentOutstanding))
  const paymentDiscipline = clamp(parseNumber(inputs.onTimePayments), 0, 100)
  const creditAge = Math.max(0, parseNumber(inputs.creditAgeYears))
  const enquiries = Math.max(0, parseNumber(inputs.recentInquiries))

  const utilisation = creditLimit > 0 ? clamp(outstanding / creditLimit, 0, 2) : 0

  let score = 640
  score += (1 - utilisation) * 140 // utilisation weighting
  score += (paymentDiscipline - 85) * 3.2
  score += Math.min(creditAge * 12, 90)
  score -= enquiries * 12

  const safeScore = clamp(Math.round(score), 300, 900)

  let grade = "Needs work"
  if (safeScore >= 780) grade = "Excellent"
  else if (safeScore >= 720) grade = "Good"
  else if (safeScore >= 660) grade = "Fair"

  const utilizationPct = creditLimit > 0 ? utilisation * 100 : 0

  return {
    score: safeScore,
    grade,
    utilizationPct: clamp(Math.round(utilizationPct), 0, 200),
    paymentDiscipline,
    creditAge,
    enquiries,
  }
}

const ScorePill = ({ children, tone }) => (
  <span
    className={cn(
      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] backdrop-blur-sm",
      tone === "positive"
        ? "bg-emerald-500/20 text-emerald-500 dark:text-emerald-400"
        : tone === "warning"
          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
          : tone === "negative"
            ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
            : "bg-white/60 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200 border border-slate-300/30 dark:border-slate-600/30"
    )}
  >
    {children}
  </span>
)


// --- New Visualization Component (Tax Comparison Bar Chart) ---
const TaxComparisonBarChart = ({ oldTax, newTax }) => {
  // --- Calculations ---
  const totalMax = Math.max(oldTax, newTax, 1) // Prevent division by zero
  const oldHeight = Math.max(15, (oldTax / totalMax) * 100) // 15% min height
  const newHeight = Math.max(15, (newTax / totalMax) * 100)

  // --- State & Logic ---
  const isOldBetter = oldTax < newTax
  const isNewBetter = newTax < oldTax
  const areEqual = oldTax === newTax
  const savings = formatCurrency(Math.abs(oldTax - newTax))

  // --- Component ---
  return (
    <div className="p-4 rounded-3xl border border-white/20 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 shadow-inner space-y-4">
      {/* Informative Title */}
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {areEqual
            ? "Both Regimes are Equal"
            : isOldBetter
            ? `Old Regime Saves ${savings}`
            : `New Regime Saves ${savings}`}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Visual comparison of payable tax
        </p>
      </div>

      {/* Bar Container */}
      <div className="flex justify-around items-end h-40 pt-4">
        {/* Old Regime Bar */}
        <div className="flex flex-col items-center w-5/12 text-center">
          <motion.div
            initial={{ height: "15%" }}
            animate={{ height: `${oldHeight}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className={cn(
              "w-full max-w-[50px] rounded-t-lg shadow-lg relative",
              isOldBetter ? "bg-emerald-500" : areEqual ? "bg-sky-500" : "bg-rose-500/90"
            )}
          >
            <div className="absolute -top-5 text-xs font-bold text-slate-800 dark:text-white w-full text-center">
              {formatCurrency(oldTax)}
            </div>
          </motion.div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-300 mt-2 font-semibold">
            Old Regime
          </p>
        </div>

        {/* New Regime Bar */}
        <div className="flex flex-col items-center w-5/12 text-center">
          <motion.div
            initial={{ height: "15%" }}
            animate={{ height: `${newHeight}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className={cn(
              "w-full max-w-[50px] rounded-t-lg shadow-lg relative",
              isNewBetter ? "bg-emerald-500" : areEqual ? "bg-sky-500" : "bg-rose-500/90"
            )}
          >
            <div className="absolute -top-5 text-xs font-bold text-slate-800 dark:text-white w-full text-center">
              {formatCurrency(newTax)}
            </div>
          </motion.div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-300 mt-2 font-semibold">
            New Regime
          </p>
        </div>
      </div>
    </div>
  )
}


// --- TaxCalculator Component (UPDATED with visualization) ---

const TaxCalculator = ({ taxInputs, handleTaxChange, oldRegime, newRegime, taxDelta, betterRegime, brandAccent }) => (
  <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] mt-8">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 22 }}
      className="space-y-6"
    >
      <Card className="rounded-[32px] border-white/15 bg-white/85 shadow-[0_26px_75px_-40px_rgba(15,23,42,0.75)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-900 dark:text-white">
            <Calculator className="h-5 w-5 text-sky-400" />
            Tax Inputs (₹)
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Provide annual figures to model tax outcomes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="salary">Salary income</Label>
              <Input
                id="salary"
                type="number"
                inputMode="decimal"
                min="0"
                value={taxInputs.salary}
                onChange={handleTaxChange("salary")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="otherIncome">Other taxable income</Label>
              <Input
                id="otherIncome"
                type="number"
                inputMode="decimal"
                min="0"
                value={taxInputs.otherIncome}
                onChange={handleTaxChange("otherIncome")}
              />
            </div>
          </div>
          <Tabs defaultValue="deductions" className="space-y-4">
            <TabsList className="inline-flex rounded-full bg-slate-200/60 p-1 text-xs font-semibold uppercase tracking-[0.28em] dark:bg-slate-800/50">
              <TabsTrigger value="deductions" className="rounded-full px-4 py-2 data-[state=active]:bg-white/80 data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900/70 dark:data-[state=active]:text-white">
                Deductions
              </TabsTrigger>
              <TabsTrigger value="notes" className="rounded-full px-4 py-2 data-[state=active]:bg-white/80 data-[state=active]:text-slate-900 dark:data-[state=active]:bg-slate-900/70 dark:data-[state=active]:text-white">
                Notes
              </TabsTrigger>
            </TabsList>
            <TabsContent value="deductions" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="deduction80C">80C investments</Label>
                  <Input
                    id="deduction80C"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={taxInputs.deduction80C}
                    onChange={handleTaxChange("deduction80C")}
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Automatically capped at ₹1.5L.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deduction80D">80D medical premiums</Label>
                  <Input
                    id="deduction80D"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={taxInputs.deduction80D}
                    onChange={handleTaxChange("deduction80D")}
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Capped at ₹75k across family & parents.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="housingInterest">Home loan interest (self-occupied)</Label>
                  <Input
                    id="housingInterest"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={taxInputs.housingInterest}
                    onChange={handleTaxChange("housingInterest")}
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Limited to ₹2L in this model.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherDeductions">Other deductions</Label>
                  <Input
                    id="otherDeductions"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={taxInputs.otherDeductions}
                    onChange={handleTaxChange("otherDeductions")}
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Include HRA, charitable donations, or education loan interest.</p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="notes" className="space-y-3 text-[11px] text-slate-500 dark:text-slate-400">
              <p>• Standard deduction of ₹50k is applied automatically when salary income is present.</p>
              <p>• Rebate under section 87A is modelled for incomes up to ₹5L (old regime) and ₹7L (new regime).</p>
              <p>• Health & education cess of 4% is added after computing slab-wise tax.</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 22, delay: 0.1 }}
      className="space-y-6"
    >
      <Card className="rounded-[32px] border-white/15 bg-white/85 shadow-[0_26px_75px_-40px_rgba(14,165,233,0.75)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-900 dark:text-white">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            Tax Results & Comparison
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Updated instantly as you edit inputs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          
          {/* Visualization Component Insertion */}
          <TaxComparisonBarChart 
            oldTax={oldRegime.taxPayable}
            newTax={newRegime.taxPayable}
            betterRegime={betterRegime}
          />

          {[oldRegime, newRegime].map((item) => (
            <div
              key={item.regime}
              className="rounded-3xl border border-white/20 bg-white/80 p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/65"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.regime} regime</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Effective rate {item.effectiveRate.toFixed(1)}%</p>
                </div>
                {/* ScorePill color logic adapted for visual consistency */}
                <ScorePill tone={(item.regime === "New" && taxDelta > 0) || (item.regime === "Old" && taxDelta < 0) ? "positive" : "neutral"}>
                  Tax {formatCurrency(item.taxPayable)}
                </ScorePill>
              </div>
              <div className="mt-4 grid gap-3 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="uppercase tracking-[0.24em]">Taxable income</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(item.taxableIncome)}</p>
                </div>
                <div className="space-y-1">
                  <p className="uppercase tracking-[0.24em]">Deductions</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(item.totalDeductions)}</p>
                </div>
                <div className="space-y-1">
                  <p className="uppercase tracking-[0.24em]">Tax before cess</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(item.taxBeforeCess)}</p>
                </div>
                <div className="space-y-1">
                  <p className="uppercase tracking-[0.24em]">Cess 4%</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(item.cess)}</p>
                </div>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-dashed border-slate-300/70 px-5 py-4 text-sm text-slate-600 dark:border-slate-700/60 dark:text-slate-300">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{betterRegime}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {taxDelta === 0
                  ? "Both regimes lead to the same payable amount in this scenario."
                  : `${taxDelta > 0 ? "New regime saves" : "Old regime saves"} ${formatCurrency(Math.abs(taxDelta))}.`}
              </p>
            </div>
            <Button
              variant="ghost"
              className="text-xs font-semibold uppercase tracking-[0.3em]"
              style={{ color: brandAccent }}
              asChild
            >
              <Link to="/digilocker-auth">Open free workspace</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  </section>
)

// --- CIBIL Simulator Component (Unchanged) ---

const CibilSimulator = ({ creditInputs, handleCreditChange, creditScore, brandAccent }) => (
  <section className="mt-8 grid gap-10 lg:grid-cols-1">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 22 }}
      className="space-y-6 max-w-2xl mx-auto w-full"
    >
      <Card className="rounded-[32px] border-white/15 bg-white/85 shadow-[0_26px_75px_-40px_rgba(14,165,233,0.75)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-900 dark:text-white">
            <TrendingUp className="h-5 w-5 text-sky-400" />
            CIBIL Score Simulator (₹ / %)
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Gauge credit health and optimisation levers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="totalCreditLimit">Total credit limit</Label>
              <Input
                id="totalCreditLimit"
                type="number"
                inputMode="decimal"
                min="0"
                value={creditInputs.totalCreditLimit}
                onChange={handleCreditChange("totalCreditLimit")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentOutstanding">Outstanding balance</Label>
              <Input
                id="currentOutstanding"
                type="number"
                inputMode="decimal"
                min="0"
                value={creditInputs.currentOutstanding}
                onChange={handleCreditChange("currentOutstanding")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="onTimePayments">On-time payments (%)</Label>
              <Input
                id="onTimePayments"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                value={creditInputs.onTimePayments}
                onChange={handleCreditChange("onTimePayments")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditAgeYears">Credit age (years)</Label>
              <Input
                id="creditAgeYears"
                type="number"
                inputMode="decimal"
                min="0"
                value={creditInputs.creditAgeYears}
                onChange={handleCreditChange("creditAgeYears")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recentInquiries">Recent enquiries (12 months)</Label>
              <Input
                id="recentInquiries"
                type="number"
                inputMode="numeric"
                min="0"
                value={creditInputs.recentInquiries}
                onChange={handleCreditChange("recentInquiries")}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/80 p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Estimated CIBIL score</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Based on utilisation, repayment, age, and inquiries.</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-semibold text-slate-900 dark:text-white">{creditScore.score}</p>
                <ScorePill tone={creditScore.score >= 720 ? "positive" : creditScore.score >= 660 ? "neutral" : "warning"}>
                  {creditScore.grade}
                </ScorePill>
              </div>
            </div>
            <div className="mt-5 grid gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>Utilisation</span>
                <span>{creditScore.utilizationPct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-sky-500"
                  style={{ width: `${clamp(creditScore.utilizationPct, 4, 100)}%` }}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/15 bg-white/75 p-4 text-xs shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                  <p className="font-semibold text-slate-900 dark:text-white">On-time payments</p>
                  <p className="text-sm">{creditScore.paymentDiscipline}%</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/75 p-4 text-xs shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                  <p className="font-semibold text-slate-900 dark:text-white">Credit history</p>
                  <p className="text-sm">{creditScore.creditAge} years</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Reduce utilisation below 30%, keep payment discipline above 95%, and limit hard inquiries to protect your score.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border-dashed border-slate-300/60 bg-white/70 p-6 text-sm text-slate-600 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.6)] backdrop-blur dark:border-slate-700/50 dark:bg-slate-900/60 dark:text-slate-400">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Need guided filings?</p>
            <p className="text-xs">Unlock AI-led reconciliations, client workflows, and bureau-ready insights.</p>
          </div>
          <Button size="sm" variant="outline" style={{ borderColor: brandAccent, color: brandAccent }} asChild>
            <Link to="/digilocker-auth">Book a walkthrough</Link>
          </Button>
        </div>
      </Card>
    </motion.div>
  </section>
)


// --- Main Page Component ---

const TaxCalculatorPage = ({ theme = "dark" }) => {
  const { branding } = useBranding()
  const navigate = useNavigate()
  const brandAccent = branding.primaryColor || "#0ea5e9"
  const brandGradient = useMemo(
    () => `linear-gradient(120deg, ${branding.primaryColor || "#0ea5e9"} 0%, ${branding.accentColor || "#14b8a6"} 100%)`,
    [branding.primaryColor, branding.accentColor]
  )

  // State to control the view: 'choice', 'tax', or 'cibil'
  const [step, setStep] = useState("choice")

  const [taxInputs, setTaxInputs] = useState({
    salary: 1200000,
    otherIncome: 100000,
    deduction80C: 150000,
    deduction80D: 45000,
    housingInterest: 180000,
    otherDeductions: 20000,
  })

  const [creditInputs, setCreditInputs] = useState({
    totalCreditLimit: 800000,
    currentOutstanding: 220000,
    onTimePayments: 96,
    creditAgeYears: 5,
    recentInquiries: 1,
  })

  const oldRegime = useMemo(() => computeOldRegime(taxInputs), [taxInputs])
  const newRegime = useMemo(() => computeNewRegime(taxInputs), [taxInputs])
  const taxDelta = oldRegime.taxPayable - newRegime.taxPayable
  const betterRegime = taxDelta > 0 ? "New regime saves" : taxDelta < 0 ? "Old regime saves" : "Both regimes equal"

  const creditScore = useMemo(() => computeCibilScore(creditInputs), [creditInputs])

  const handleTaxChange = (field) => (event) => {
    const nextValue = event.target.value
    setTaxInputs((prev) => ({ ...prev, [field]: nextValue }))
  }

  const handleCreditChange = (field) => (event) => {
    const nextValue = event.target.value
    setCreditInputs((prev) => ({ ...prev, [field]: nextValue }))
  }

  // Determine header button based on the current step
  const headerButton = step === "choice" ? (
    <Button
      variant="ghost"
      className="group flex items-center gap-3 rounded-full border border-white/30 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-800 shadow-sm backdrop-blur hover:bg-white dark:border-slate-600/50 dark:bg-slate-800/90 dark:text-slate-100 hover:dark:bg-slate-800"
      onClick={() => navigate(-1)}
    >
      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
      Back
    </Button>
  ) : (
    <Button
      variant="ghost"
      className="group flex items-center gap-3 rounded-full border border-white/30 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-800 shadow-sm backdrop-blur hover:bg-white dark:border-slate-600/50 dark:bg-slate-800/90 dark:text-slate-100 hover:dark:bg-slate-800"
      onClick={() => setStep("choice")}
    >
      <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
      Back to tools
    </Button>
  )

  // Render content based on the current step
  const renderContent = () => {
    if (step === "tax") {
      return (
        <TaxCalculator
          taxInputs={taxInputs}
          handleTaxChange={handleTaxChange}
          oldRegime={oldRegime}
          newRegime={newRegime}
          taxDelta={taxDelta}
          betterRegime={betterRegime}
          brandAccent={brandAccent}
        />
      )
    }

    if (step === "cibil") {
      return (
        <CibilSimulator
          creditInputs={creditInputs}
          handleCreditChange={handleCreditChange}
          creditScore={creditScore}
          brandAccent={brandAccent}
        />
      )
    }

    // Default: Choice View
    return (
      <>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
          className="space-y-6 text-slate-800 dark:text-slate-200 max-w-2xl mx-auto text-center"
        >
          <ScorePill tone="neutral">Pro bono tools · No login required</ScorePill>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
            Choose a financial tool to simulate outcomes
          </h1>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
            Select an option below to simulate your tax liability or credit score. Use this sandbox to plan before onboarding the workspace.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
            <div className="inline-flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Client-safe preview experience
            </div>
            <div className="inline-flex items-center gap-2">
              <Sparkle className="h-3.5 w-3.5 text-purple-500" /> Based on FY 2024 slabs
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-dashed border-slate-400/60 bg-white/50 px-4 py-3 text-xs text-slate-600 dark:border-slate-600/50 dark:bg-slate-800/30 dark:text-slate-300 max-w-lg mx-auto font-medium backdrop-blur-sm">
            <LineChart className="mt-1 h-4 w-4 text-sky-500" />
            Results are indicative only. Consult your tax advisor for personalised guidance.
          </div>
        </motion.div>

        <section className="mt-12 grid gap-8 sm:grid-cols-2 lg:max-w-4xl lg:mx-auto">
          {[{
            icon: Calculator,
            title: "Tax Regime Calculator",
            copy: "Compare tax liability under the Old vs. New slabs, factoring in deductions, rebates, and cess.",
            action: () => setStep("tax"),
            tone: "sky",
          },
          {
            icon: GaugeCircle,
            title: "CIBIL Score Simulator",
            copy: "Estimate your credit score based on utilisation, repayment history, age, and recent inquiries.",
            action: () => setStep("cibil"),
            tone: "emerald",
          }].map((item) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 22, delay: 0.1 }}
            >
              <Card
                onClick={item.action}
                className="cursor-pointer group rounded-[32px] border-white/15 bg-white/85 shadow-lg backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70 transition-all hover:shadow-[0_26px_75px_-30px_rgba(14,165,233,0.75)] hover:scale-[1.01]"
              >
                <CardHeader className="space-y-1">
                  <item.icon className={`h-6 w-6 ${item.tone === 'sky' ? 'text-sky-400' : 'text-emerald-400'}`} />
                  <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white mt-4">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                    {item.copy}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm"
                    className="mt-4 rounded-full px-5 text-xs font-semibold uppercase tracking-[0.28em] text-white shadow-[0_18px_45px_-30px_rgba(14,165,233,0.65)]"
                    style={{ backgroundImage: brandGradient }}
                  >
                    Launch Tool
                    <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>
      </>
    )
  }

  return (
    <div
      className={cn(
        "min-h-screen overflow-hidden",
        theme === "dark"
          ? "bg-[#050a15] text-slate-100"
          : "bg-slate-50 text-slate-900"
      )}
    >
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-0 opacity-20 blur-[120px]"
          style={{ background: brandGradient }}
        />
        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-16 pt-10 sm:px-8 lg:px-12">
          <header className="flex flex-wrap items-center justify-between gap-4">
            {/* Conditional back button */}
            {headerButton}
            
            <LogoBadge size="sm" className="rounded-full border border-white/30 bg-white/90 px-3 py-2 shadow-sm dark:border-slate-600/50 dark:bg-slate-800/90" />
            <Button
              size="sm"
              className="rounded-full px-5 text-xs font-semibold uppercase tracking-[0.28em] text-white shadow-[0_18px_45px_-30px_rgba(14,165,233,0.65)]"
              style={{ backgroundImage: brandGradient }}
              asChild
            >
              <Link to="/aadhaar-auth?mode=signup">
                Get started
                <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </header>

          <main className={`mt-12 flex flex-1 flex-col ${step === 'choice' ? '' : 'lg:max-w-5xl lg:mx-auto w-full'}`}>
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  )
}

export default TaxCalculatorPage