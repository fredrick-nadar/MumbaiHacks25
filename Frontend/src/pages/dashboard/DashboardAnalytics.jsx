'use client'

import React, { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Lightbulb,
  PieChart,
  Sparkles,
} from "lucide-react"
import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Sector, Tooltip } from "recharts"

import {
  useDashboardSummary,
  useDashboardTrends,
  useTransactionsSummary,
  useTaxSimulation,
} from "../../hooks/useDashboardApi"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Button } from "../../components/ui/button"
import { cn } from "../../lib/utils"
import { useAuth } from "../../contexts/AuthContext"

const palette = ["#38bdf8", "#22d3ee", "#34d399", "#a855f7", "#f97316"]
const MotionDiv = motion.div
const formatCurrency = (value = 0) => `₹${Math.round(value).toLocaleString()}`

const normaliseLabel = (label = "") =>
  label
    .toString()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase())

const monthShort = (year, month) =>
  new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "short",
  })

const pickNumeric = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue
    let numeric = value
    if (typeof value === "string") {
      const cleaned = value.replace(/[^0-9.-]+/g, "")
      numeric = cleaned ? Number(cleaned) : Number.NaN
    }
    if (typeof numeric === "number" && Number.isFinite(numeric)) {
      return numeric
    }
  }
  return 0
}

const resolveShare = (...values) => {
  const numeric = pickNumeric(...values)
  if (numeric <= 0) return 0
  if (numeric > 1) return numeric / 100
  return numeric
}

const AnimatedPie = ({ segments, activeLabel, observationLabel, onSegmentFocus, onSegmentSelect }) => {
  const [hoveredLabel, setHoveredLabel] = useState(null)

  const safeSegments = useMemo(
    () =>
      segments.map((segment) => ({
        ...segment,
        value: Math.max(1, Number(segment.value) || 1),
      })),
    [segments]
  )

  const highlightedLabel = useMemo(() => {
    if (!safeSegments.length) return null
    if (hoveredLabel && safeSegments.some((seg) => seg.label === hoveredLabel)) {
      return hoveredLabel
    }
    if (activeLabel && safeSegments.some((seg) => seg.label === activeLabel)) {
      return activeLabel
    }
    return safeSegments[0]?.label ?? null
  }, [activeLabel, hoveredLabel, safeSegments])

  const activeIndex = safeSegments.findIndex((segment) => segment.label === highlightedLabel)
  const activeSegment = activeIndex >= 0 ? safeSegments[activeIndex] : safeSegments[0] ?? null
  const outflowShare = Math.round((activeSegment?.shareOfOutflows ?? 0) * 100)
  const inflowShare = Math.round((activeSegment?.shareOfInflows ?? 0) * 100)
  const observationDescriptor = observationLabel?.toLowerCase?.() ?? "this period"

  const handleFocus = (label) => {
    if (!label) return
    onSegmentFocus?.(label)
  }

  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.95}
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    )
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const datum = payload[0]?.payload
    if (!datum) return null
    const inflowPct = Math.round((datum.shareOfInflows ?? 0) * 100)
    const outflowPct = Math.round((datum.shareOfOutflows ?? 0) * 100)
    return (
      <div className="rounded-2xl border border-white/20 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/90 dark:text-slate-300">
        <p className="font-semibold text-slate-900 dark:text-white">{datum.label}</p>
        <p>Value ₹{Math.round(datum.value).toLocaleString()}</p>
        {inflowPct > 0 && <p className="text-emerald-500">Inflows {inflowPct}%</p>}
        {outflowPct > 0 && <p className="text-rose-500">Outflows {outflowPct}%</p>}
      </div>
    )
  }

  return (
    <MotionDiv
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
      className="relative mx-auto flex h-72 w-72 items-center justify-center md:h-80 md:w-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={safeSegments}
            dataKey="value"
            nameKey="label"
            innerRadius={68}
            outerRadius={110}
            paddingAngle={2}
            animationDuration={320}
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onMouseLeave={() => {
              setHoveredLabel(null)
              handleFocus(highlightedLabel)
            }}
          >
            {safeSegments.map((segment) => (
              <Cell
                key={segment.label}
                fill={segment.color}
                stroke="white"
                strokeWidth={1}
                onMouseEnter={() => {
                  setHoveredLabel(segment.label)
                  handleFocus(segment.label)
                }}
                onClick={() => {
                  onSegmentSelect?.(segment.label)
                }}
                style={{ cursor: "pointer" }}
              />
            ))}
          </Pie>
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "transparent" }}
            wrapperStyle={{ zIndex: 30 }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-[82px] flex flex-col items-center gap-3 rounded-full border border-white/35 bg-white/95 px-6 py-5 text-center shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/92">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Focus mix</p>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">{activeSegment?.label ?? "—"}</p>
        <p className="text-[55%] text-slate-400 dark:text-slate-500">
          {outflowShare}% of outflows · {observationDescriptor}
        </p>
        {inflowShare > 0 && (
          <p className="text-[55%] text-emerald-500 dark:text-emerald-300">{inflowShare}% of inflows</p>
        )}
      </div>
    </MotionDiv>
  )
}

const HealthBreakdown = ({ breakdown = [] }) => {
  if (!breakdown.length) return null

  const barClass = (ratio) => {
    if (ratio >= 0.8) return "from-emerald-400 to-green-400"
    if (ratio >= 0.6) return "from-sky-400 to-cyan-400"
    return "from-rose-400 to-amber-400"
  }

  return (
    <div className="grid gap-3">
      {breakdown.map((item) => {
        const ratio = item.weight > 0 ? item.contribution / item.weight : 0
        const ctx = item.context || {}
        let contextDescription = null

        if (item.label === "Income capacity" && ctx.observedIncome !== undefined && ctx.incomeTarget !== undefined) {
          contextDescription = `₹${ctx.observedIncome.toLocaleString()} captured vs ₹${ctx.incomeTarget.toLocaleString()} target.`
        } else if (item.label === "Net cash retention" && ctx.observedNetFlow !== undefined && ctx.cashRetentionTarget !== undefined) {
          contextDescription = `Retained ₹${ctx.observedNetFlow.toLocaleString()} against ₹${ctx.cashRetentionTarget.toLocaleString()} goal.`
        } else if (item.label === "Expense control" && ctx.expenseChange !== undefined && ctx.expenseChange !== null) {
          const delta = Math.abs(ctx.expenseChange).toFixed(1)
          contextDescription = ctx.expenseChange >= 0 ? `Expenses rose ${delta}% vs last month.` : `Expenses fell ${delta}% vs last month.`
        } else if (item.label === "Credit health" && ctx.estimatedScore !== undefined) {
          const utilizationPct = ctx.utilization != null ? Math.round(ctx.utilization * 100) : null
          contextDescription = `Score ${ctx.estimatedScore}${utilizationPct != null ? ` · Utilisation ${utilizationPct}%` : ""}`
        } else if (item.label === "Tax posture" && ctx.recommendedRegime) {
          contextDescription = `Optimised for ${ctx.recommendedRegime.toUpperCase()} regime.`
        } else if (item.label === "Data coverage" && ctx.observedTransactionCount !== undefined) {
          contextDescription = `${ctx.observedTransactionCount} ledger entries analysed.`
        }

        return (
          <div key={item.label} className="space-y-2 rounded-2xl border border-white/20 bg-white/70 p-3 dark:border-slate-700/60 dark:bg-slate-900/70">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>{item.label}</span>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {item.contribution}/{item.weight}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/70">
              <div
                className={cn("h-full rounded-full bg-gradient-to-r", barClass(ratio))}
                style={{ width: `${Math.max(6, ratio * 100)}%` }}
              />
            </div>
            {(contextDescription || ctx.message) && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{contextDescription || ctx.message}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

const FilingVelocityChart = ({ series, observationLabel, fallbackIncome = 0, fallbackExpenses = 0 }) => {
  const baseSeries = series.length
    ? series
    : [
        { monthLabel: "Jan", income: 0, expenses: 0, net: 0 },
        { monthLabel: "Feb", income: 0, expenses: 0, net: 0 },
      ]

  const hasMeaningfulData = baseSeries.some((row) => Math.max(pickNumeric(row.income), pickNumeric(row.expenses)) > 0)

  const syntheticSeries = useMemo(() => {
    if (hasMeaningfulData) return null
    const income = Math.max(0, fallbackIncome)
    const expenses = Math.max(0, fallbackExpenses)
    if (income <= 0 && expenses <= 0) return null

    const months = 4
    const baseIncome = income > 0 ? income / months : expenses > 0 ? (expenses / months) * 1.25 : 25000
    const baseExpenses = expenses > 0 ? expenses / months : baseIncome * 0.7
    const modifiers = [0.86, 0.94, 1.04, 1.12]

    return modifiers.map((modifier, index) => {
      const now = new Date()
      now.setMonth(now.getMonth() - (modifiers.length - 1 - index))
      const incomeValue = Math.round(baseIncome * modifier)
      const expenseMod = 1.04 - index * 0.05
      const expenseValue = Math.round(baseExpenses * (expenseMod > 0 ? expenseMod : 0.55))
      return {
        monthLabel: monthShort(now.getFullYear(), now.getMonth() + 1),
        income: incomeValue,
        expenses: expenseValue,
        net: incomeValue - expenseValue,
      }
    })
  }, [fallbackExpenses, fallbackIncome, hasMeaningfulData])

  const safeSeries = syntheticSeries ?? baseSeries
  const usingSyntheticSeries = Boolean(syntheticSeries)

  const totals = safeSeries.reduce(
    (acc, row) => {
      acc.income += Math.max(0, pickNumeric(row.income))
      acc.expenses += Math.max(0, pickNumeric(row.expenses))
      acc.net += pickNumeric(row.net)
      return acc
    },
    { income: 0, expenses: 0, net: 0 }
  )

  const months = safeSeries.length || 1
  const avgIncome = totals.income / months
  const avgExpenses = totals.expenses / months
  const avgNet = totals.net / months
  const latest = safeSeries[safeSeries.length - 1] ?? { income: 0, expenses: 0, net: 0, monthLabel: "—" }
  const recentWindow = safeSeries.slice(-4)
  const observationText = observationLabel?.toLowerCase?.() ?? "this period"

  const maxMagnitude = Math.max(
    ...recentWindow.map((row) => Math.max(Math.abs(pickNumeric(row.income)), Math.abs(pickNumeric(row.expenses)))),
    1
  )

  const renderBar = (value, tone) => {
    const amount = Math.max(0, pickNumeric(value))
    const width = `${Math.max(6, Math.round((amount / maxMagnitude) * 100))}%`
    const toneClass =
      tone === "income"
        ? "bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300"
        : "bg-gradient-to-r from-rose-400 via-amber-300 to-orange-300"
    return <div className={cn("h-2 rounded-full", toneClass)} style={{ width }} />
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Avg monthly inflow",
            value: formatCurrency(avgIncome),
            detail: `${months} month${months > 1 ? "s" : ""} captured`,
            tone: "income",
          },
          {
            label: "Avg monthly outflow",
            value: formatCurrency(avgExpenses),
            detail: `${observationText} window`,
            tone: "expense",
          },
          {
            label: "Net momentum",
            value: formatCurrency(avgNet),
            detail: `Best month: ${recentWindow.reduce((prev, current) =>
              pickNumeric(current.net) > pickNumeric(prev.net) ? current : prev
            ).monthLabel ?? "—"}`,
            tone: avgNet >= 0 ? "income" : "expense",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-white/20 bg-white/85 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{item.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
          </div>
        ))}
      </div>
      <div className="rounded-[32px] border border-white/15 bg-white/90 px-6 py-6 shadow-[0_28px_70px_-44px_rgba(14,165,233,0.55)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
              Recent filing velocity
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Latest month {latest?.monthLabel ?? "—"}: {formatCurrency(latest?.income ?? 0)} in / {formatCurrency(latest?.expenses ?? 0)} out
            </p>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Net change {formatCurrency(latest?.net ?? 0)}</div>
        </div>
        {usingSyntheticSeries && (
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Ledger inflows are inferred to illustrate trend. Import more statements to replace this modelled series.
          </p>
        )}
        <div className="mt-5 space-y-3">
          {recentWindow.map((row) => (
            <div key={row.monthLabel} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{row.monthLabel}</span>
                <span>{formatCurrency(pickNumeric(row.net))} net</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  {renderBar(row.income, "income")}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Inflow {formatCurrency(Math.max(0, pickNumeric(row.income)))}
                  </p>
                </div>
                <div className="flex-1 space-y-1">
                  {renderBar(row.expenses, "expense")}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Outflow {formatCurrency(Math.max(0, pickNumeric(row.expenses)))}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const cohortTabs = [
  {
    value: "quarter",
    label: "Quarter",
    data: [
      { metric: "Average filing cycle", value: "3.2 days", change: "-1.1 days", detail: "From ingestion to bureau handoff" },
      { metric: "AI assisted", value: "82%", change: "+6%", detail: "Filings closed without manual edits" },
      { metric: "Manual overrides", value: "11", change: "-4", detail: "Steps escalated to reviewers" },
    ],
  },
  {
    value: "month",
    label: "Month",
    data: [
      { metric: "Average filing cycle", value: "2.8 days", change: "-0.4 days", detail: "Top clients fast-tracked" },
      { metric: "AI assisted", value: "88%", change: "+3%", detail: "Automation coverage" },
      { metric: "Manual overrides", value: "8", change: "-2", detail: "Triggered by anomaly guard" },
    ],
  },
]

const LoadingState = () => (
  <div className="grid gap-4 sm:grid-cols-2">
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={index}
        className="h-36 animate-pulse rounded-3xl border border-white/10 bg-white/70 dark:border-slate-700/60 dark:bg-slate-900/70"
      />
    ))}
  </div>
)

const SnapshotSkeleton = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={index}
        className="h-24 animate-pulse rounded-3xl border border-white/20 bg-white/80 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70"
      />
    ))}
  </div>
)

export const DashboardAnalytics = () => {
  const { data: summaryData, loading: loadingSummary } = useDashboardSummary()
  const { data: trendsData, loading: loadingTrends } = useDashboardTrends()
  const { data: transactionsSummary, loading: loadingTransactions } = useTransactionsSummary(90)
  const { data: taxData, loading: loadingTax } = useTaxSimulation()
  const { fetchWithAuth, API_BASE } = useAuth()

  const [downloadingReport, setDownloadingReport] = useState(false)
  const [downloadError, setDownloadError] = useState(null)
  const [activeSlice, setActiveSlice] = useState("No data")

  const summary = summaryData?.summary
  const observationLabel = summary?.periodLabel ?? "This month"
  const observationDescriptor = observationLabel.toLowerCase()
  const healthBreakdown = summary?.healthBreakdown ?? []
  const healthSignals = useMemo(() => summary?.healthSignals ?? [], [summary?.healthSignals])
  const transactionsAnalysed = summary?.transactionCount ?? 0
  const topCategories = useMemo(() => summaryData?.topCategories ?? [], [summaryData?.topCategories])

  const categorySummaryStats = useMemo(() => {
    const stats = transactionsSummary?.categoryStats ?? []
    if (!stats.length) return []

    return stats.map((entry) => {
      const credit = Math.max(0, pickNumeric(entry.credit))
      const debit = Math.max(0, pickNumeric(entry.debit))
      return {
        label: normaliseLabel(entry._id ?? entry.category ?? "uncategorized"),
        credit,
        debit,
        net: pickNumeric(entry.net, credit - debit),
        shareOfInflows: entry.shareOfInflows ?? 0,
        shareOfOutflows: entry.shareOfOutflows ?? 0,
        count: entry.count ?? entry.transactionCount ?? 0,
      }
    })
  }, [transactionsSummary?.categoryStats])

  const fallbackCategoryTotals = useMemo(() => {
    if (categorySummaryStats.length) {
      return categorySummaryStats.reduce(
        (acc, entry) => {
          acc.debit += Math.max(0, pickNumeric(entry.debit))
          acc.credit += Math.max(0, pickNumeric(entry.credit))
          return acc
        },
        { debit: 0, credit: 0 }
      )
    }

    if (topCategories.length) {
      return topCategories.reduce(
        (acc, entry) => {
          acc.debit += Math.max(
            0,
            pickNumeric(
              entry.debit,
              entry.totalDebit,
              entry.total,
              entry.outflow,
              entry.outflows,
              entry.expense,
              entry.amountOut,
              entry.spend
            )
          )
          acc.credit += Math.max(
            0,
            pickNumeric(
              entry.credit,
              entry.totalCredit,
              entry.inflow,
              entry.inflows,
              entry.income,
              entry.amountIn,
              entry.revenue
            )
          )
          return acc
        },
        { debit: 0, credit: 0 }
      )
    }

    return { debit: 0, credit: 0 }
  }, [categorySummaryStats, topCategories])

  const summaryCategoryTotals = summaryData?.categoryTotals ?? null
  const ledgerTotals = transactionsSummary?.totals ?? null

  const ledgerOutflowsValue = (() => {
    const fromTransactions = Math.max(0, pickNumeric(ledgerTotals?.totalDebit))
    if (fromTransactions > 0) return fromTransactions
    const fromSummary = Math.max(0, pickNumeric(summaryCategoryTotals?.totalOutflows))
    if (fromSummary > 0) return fromSummary
    return Math.max(0, fallbackCategoryTotals.debit)
  })()

  const ledgerInflowsValue = (() => {
    const fromTransactions = Math.max(0, pickNumeric(ledgerTotals?.totalCredit))
    if (fromTransactions > 0) return fromTransactions
    const fromSummary = Math.max(0, pickNumeric(summaryCategoryTotals?.totalInflows))
    if (fromSummary > 0) return fromSummary
    return Math.max(0, fallbackCategoryTotals.credit)
  })()

  const normaliseRounded = (value) => {
    if (!Number.isFinite(value)) return 0
    return Math.round(value)
  }

  const ledgerOutflows = normaliseRounded(ledgerOutflowsValue)
  const ledgerInflows = normaliseRounded(ledgerInflowsValue)
  const ledgerNet = ledgerInflows - ledgerOutflows

  const baseIncomeBreakdown = taxData?.incomeBreakdown ?? {}
  const taxGrossIncome = taxData?.grossIncome
  const taxMetaIncome = taxData?.meta?.totalIncomeFromTx

  const basePieSegments = useMemo(() => {
    const source = categorySummaryStats.length
      ? categorySummaryStats
      : topCategories.map((cat) => {
          const debitRaw = pickNumeric(
            cat.debit,
            cat.totalDebit,
            cat.total,
            cat.outflow,
            cat.outflows,
            cat.expense,
            cat.amountOut,
            cat.spend
          )
          const creditRaw = pickNumeric(
            cat.credit,
            cat.totalCredit,
            cat.inflow,
            cat.inflows,
            cat.income,
            cat.amountIn,
            cat.revenue
          )
          return {
            label: normaliseLabel(cat._id ?? cat.category ?? "Category"),
            credit: Math.max(0, creditRaw),
            debit: Math.max(0, debitRaw),
            net: pickNumeric(cat.net, creditRaw - debitRaw),
            shareOfOutflows: resolveShare(cat.shareOfOutflows, cat.outflowShare, cat.debitShare, cat.shareOfDebits),
            shareOfInflows: resolveShare(cat.shareOfInflows, cat.inflowShare, cat.creditShare, cat.shareOfCredits),
            count: cat.count ?? cat.transactionCount ?? 0,
          }
        })

    if (!source.length) {
      return [
        {
          label: "No data",
          value: 1,
          color: palette[0],
          shareOfOutflows: 0,
          shareOfInflows: 0,
          debit: 0,
          credit: 0,
          net: 0,
          count: 0,
        },
      ]
    }

    const sorted = [...source].sort(
      (a, b) => Math.abs(b.debit) + Math.abs(b.credit) - (Math.abs(a.debit) + Math.abs(a.credit))
    )
    const limited = sorted.slice(0, 6)
    const totalDebit = limited.reduce((total, item) => total + Math.max(0, item.debit), 0)
    const totalCredit = limited.reduce((total, item) => total + Math.max(0, item.credit), 0)

    return limited.map((item, index) => {
      const debit = Math.round(item.debit)
      const credit = Math.round(item.credit)
      const net = Math.round(item.net)
      const outflowShare = item.shareOfOutflows ?? (totalDebit > 0 ? debit / totalDebit : 0)
      const inflowShare = item.shareOfInflows ?? (totalCredit > 0 ? credit / totalCredit : 0)

      return {
        label: item.label,
        value: Math.max(1, Math.round(Math.abs(debit) + Math.abs(credit))),
        color: palette[index % palette.length],
        shareOfOutflows: outflowShare,
        shareOfInflows: inflowShare,
        debit,
        credit,
        net,
        count: item.count ?? 0,
      }
    })
  }, [categorySummaryStats, topCategories])

  const approxGrossIncome = useMemo(() => {
    const breakdown = baseIncomeBreakdown
    const breakdownSum = ["salary", "other", "capitalGains"].reduce(
      (acc, key) => acc + Math.max(0, pickNumeric(breakdown?.[key])),
      0
    )
    const metaGross = Math.max(0, pickNumeric(taxGrossIncome, taxMetaIncome))
    const ledgerCredits = Math.max(
      0,
      pickNumeric(
        ledgerInflows,
        transactionsSummary?.totals?.totalCredit,
        transactionsSummary?.totalIncome,
        summary?.currentMonthIncome
      )
    )
    const summaryIncome = Math.max(0, pickNumeric(summary?.currentMonthIncome))
    return Math.max(0, Math.round(Math.max(metaGross, breakdownSum, ledgerCredits, summaryIncome)))
  }, [
    baseIncomeBreakdown,
    ledgerInflows,
    summary?.currentMonthIncome,
    taxGrossIncome,
    taxMetaIncome,
    transactionsSummary?.totals?.totalCredit,
    transactionsSummary?.totalIncome,
  ])

  const pieSegments = useMemo(() => {
    const cloned = basePieSegments.map((segment) => ({ ...segment }))
    const hasCreditedCategory = cloned.some((segment) => Math.max(0, pickNumeric(segment.credit)) > 0)
    let working = cloned

    if (!hasCreditedCategory && approxGrossIncome > 0) {
      working = [
        ...cloned,
        {
          label: "Modelled inflows",
          value: Math.max(1, Math.round(approxGrossIncome)),
          color: palette[cloned.length % palette.length],
          shareOfOutflows: 0,
          shareOfInflows: 1,
          debit: 0,
          credit: Math.round(approxGrossIncome),
          net: Math.round(approxGrossIncome),
          count: 0,
          synthetic: true,
        },
      ]
    }

    const totals = working.reduce(
      (acc, segment) => {
        acc.debit += Math.max(0, pickNumeric(segment.debit))
        acc.credit += Math.max(0, pickNumeric(segment.credit))
        return acc
      },
      { debit: 0, credit: 0 }
    )

    const safeDebit = totals.debit > 0 ? totals.debit : 0
    const safeCredit = totals.credit > 0 ? totals.credit : 0

    return working.map((segment, index) => {
      const debit = Math.max(0, pickNumeric(segment.debit))
      const credit = Math.max(0, pickNumeric(segment.credit))
      const recalculatedValue = Math.max(1, Math.round(debit + credit || segment.value || 1))
      return {
        ...segment,
        value: recalculatedValue,
        shareOfOutflows: safeDebit > 0 ? debit / safeDebit : segment.shareOfOutflows ?? 0,
        shareOfInflows: safeCredit > 0 ? credit / safeCredit : segment.shareOfInflows ?? 0,
        color: segment.color ?? palette[index % palette.length],
      }
    })
  }, [approxGrossIncome, basePieSegments])

  const segmentLabels = useMemo(() => pieSegments.map((seg) => seg.label), [pieSegments])
  const hasSyntheticCategory = useMemo(() => pieSegments.some((segment) => segment.synthetic), [pieSegments])

  useEffect(() => {
    if (!segmentLabels.length) {
      setActiveSlice("No data")
      return
    }
    if (!segmentLabels.includes(activeSlice)) {
      setActiveSlice(segmentLabels[0])
    }
  }, [activeSlice, segmentLabels])

  const activeSegment = pieSegments.find((seg) => seg.label === activeSlice) ?? pieSegments[0] ?? null
  const activeOutflowShare = Math.round((activeSegment?.shareOfOutflows ?? 0) * 100)
  const activeInflowShare = Math.round((activeSegment?.shareOfInflows ?? 0) * 100)

  const chartSeries = useMemo(() => {
    const raw = trendsData?.trends ?? []
    if (!raw.length) {
      return [
        { monthLabel: "Jan", income: 0, expenses: 0, net: 0 },
        { monthLabel: "Feb", income: 0, expenses: 0, net: 0 },
      ]
    }
    return raw.map((row) => {
      const year = row._id?.year ?? new Date().getFullYear()
      const month = row._id?.month ?? 1
      const incomeValue = pickNumeric(
        row.income,
        row.totalCredit,
        row.credit,
        row.inflows,
        row.inflow,
        row.cashInflow,
        row.revenue
      )
      const expenseValue = pickNumeric(
        row.expenses,
        row.totalDebit,
        row.debit,
        row.outflows,
        row.outflow,
        row.cashOutflow,
        row.spend
      )
      const income = Math.max(0, Math.round(incomeValue))
      const expenses = Math.max(0, Math.round(expenseValue))
      const net = Math.round(pickNumeric(row.net, income - expenses))
      return {
        monthLabel: monthShort(year, month),
        income,
        expenses,
        net,
      }
    })
  }, [trendsData])

  const fallbackVelocityIncome = Math.max(
    0,
    approxGrossIncome,
    pickNumeric(summary?.currentMonthIncome),
    pickNumeric(transactionsSummary?.totals?.totalCredit),
    Math.max(0, ledgerInflows)
  )

  const fallbackVelocityExpenses = Math.max(
    0,
    pickNumeric(summary?.currentMonthExpenses),
    pickNumeric(transactionsSummary?.totals?.totalDebit),
    Math.max(0, ledgerOutflows)
  )

  const ingestionBreakdown = useMemo(() => {
    const categoryStats = (transactionsSummary?.categoryStats ?? [])
      .filter((entry) => (entry.credit ?? 0) > 0 || (entry.debit ?? 0) > 0)
      .slice(0, 4)
      .map((entry) => {
        const credit = Math.round(entry.credit || 0)
        const debit = Math.round(entry.debit || 0)
        return {
          label: normaliseLabel(entry._id ?? "uncategorized"),
          credit,
          debit,
          net: credit - debit,
          shareOfOutflows: entry.shareOfOutflows ?? 0,
          shareOfInflows: entry.shareOfInflows ?? 0,
          count: entry.count ?? 0,
        }
      })

    if (categoryStats.length) return categoryStats

    const fallback = (summaryData?.topCategories ?? [])
      .filter((entry) => (entry.credit ?? entry.totalCredit ?? entry.inflows ?? 0) > 0 || (entry.debit ?? entry.totalDebit ?? entry.outflows ?? 0) > 0)
      .slice(0, 4)
      .map((entry) => {
        const credit = Math.round(entry.credit ?? entry.totalCredit ?? entry.inflows ?? 0)
        const debit = Math.round(entry.debit ?? entry.totalDebit ?? entry.outflows ?? 0)
        return {
          label: normaliseLabel(entry.category ?? entry.name ?? "uncategorized"),
          credit,
          debit,
          net: credit - debit,
          shareOfOutflows: entry.shareOfOutflows ?? entry.outflowShare ?? 0,
          shareOfInflows: entry.shareOfInflows ?? entry.inflowShare ?? 0,
          count: entry.count ?? entry.entries ?? 0,
        }
      })

    return fallback
  }, [summaryData?.topCategories, transactionsSummary?.categoryStats])

  const primaryHealthSignal = healthSignals[0]

  const insightTiles = useMemo(() => {
    if (!summary) return []
    const netCash = summary.monthlyNetFlow ?? 0
    const savingsRate = summary.savingsRate ?? 0
    const healthScore = summary.healthScore ?? 0
    const healthStatus = summary.healthStatus ?? "N/A"
    const incomeDelta = summaryData?.changes?.incomeChange ?? null
    let netAccent = "Reduce burn or add inflows"

    if (netCash >= 0) {
      if (incomeDelta === null) {
        netAccent = `Positive retention ${observationDescriptor}`
      } else if (incomeDelta >= 0) {
        netAccent = `Income up ${incomeDelta.toFixed(1)}% vs prior month`
      } else {
        netAccent = `Income down ${Math.abs(incomeDelta).toFixed(1)}% vs prior month`
      }
    }

    return [
      {
        title: "Financial health",
        value: `${healthScore}/100`,
        detail: `${healthStatus} · ${transactionsAnalysed} ledger entries`,
        accent: primaryHealthSignal ?? "Composite of cash, credit, and tax posture",
        tone: healthScore >= 80 ? "emerald" : healthScore >= 60 ? "sky" : "rose",
      },
      {
        title: "Savings rate",
        value: `${savingsRate}%`,
        detail: `${observationLabel} retention across inflows`,
        accent: savingsRate >= 20
          ? "Healthy cushion"
          : savingsRate > 0
            ? "Keep compounding"
            : "Negative savings — tighten spend",
        tone: savingsRate >= 20 ? "emerald" : savingsRate > 0 ? "sky" : "rose",
      },
      {
        title: "Net cash",
        value: formatCurrency(netCash),
        detail: netCash >= 0 ? `Surplus this ${observationDescriptor}` : `Shortfall this ${observationDescriptor}`,
        accent: netAccent,
        tone: netCash >= 0 ? "emerald" : "rose",
      },
    ]
  }, [summary, summaryData?.changes?.incomeChange, observationDescriptor, observationLabel, transactionsAnalysed, primaryHealthSignal])

  const insightsList = useMemo(() => summaryData?.insights ?? [], [summaryData?.insights])
  const alertsList = useMemo(() => summaryData?.alerts ?? [], [summaryData?.alerts])

  const highlightItems = useMemo(
    () => [
      ...healthSignals.map((message) => ({ type: "signal", message })),
      ...insightsList.map((message) => ({ type: "insight", message })),
    ],
    [healthSignals, insightsList]
  )

  const taxBars = useMemo(() => {
    if (!taxData) return []

    const recommended = taxData?.recommendation?.regime?.toLowerCase?.()
    const computeAmount = (...values) => Math.max(0, Math.round(pickNumeric(...values)))

    const oldRegimeTax = computeAmount(taxData.oldRegime?.tax, taxData.oldRegimeTax, taxData.taxProfile?.oldRegimeTax)
    const newRegimeTax = computeAmount(taxData.newRegime?.tax, taxData.newRegimeTax, taxData.taxProfile?.newRegimeTax)

    const deductionBreakdown = taxData?.deductionBreakdown ?? {}
    const oldDeductionParts = []
    if ((deductionBreakdown.section80C ?? 0) > 0) oldDeductionParts.push(`80C ${formatCurrency(deductionBreakdown.section80C)}`)
    if ((deductionBreakdown.section80D ?? 0) > 0) oldDeductionParts.push(`80D ${formatCurrency(deductionBreakdown.section80D)}`)
    if ((deductionBreakdown.section80G ?? 0) > 0) oldDeductionParts.push(`80G ${formatCurrency(deductionBreakdown.section80G)}`)
    if ((deductionBreakdown.section24B ?? 0) > 0) oldDeductionParts.push(`24(b) ${formatCurrency(deductionBreakdown.section24B)}`)

    const oldNote = oldDeductionParts.length
      ? oldDeductionParts.join(" · ")
      : `Deductions ${formatCurrency(deductionBreakdown.oldRegime ?? 0)}`

    const standardDeductionAmount = formatCurrency(
      deductionBreakdown.standardDeduction ?? taxData.newRegime?.standardDeduction ?? 0
    )
    const newNote = `Standard deduction ${standardDeductionAmount}`

    return [
      {
        label: "Old regime",
        regime: "old",
        amount: oldRegimeTax,
        fill: "#fb7185",
        note: oldNote,
      },
      {
        label: "New regime",
        regime: "new",
        amount: newRegimeTax,
        fill: "#38bdf8",
        note: newNote,
      },
    ].map((bar) => ({ ...bar, recommended: recommended === bar.regime }))
  }, [taxData])

  const hasRealTaxData = taxBars.some((bar) => (bar?.amount ?? 0) > 0)

  const ledgerFallbackTaxBars = useMemo(() => {
    if (hasRealTaxData) return []

    const reportedGross = Math.max(0, pickNumeric(taxData?.grossIncome, taxData?.meta?.totalIncomeFromTx))
    const monthlySummaryIncome = Math.max(0, pickNumeric(summary?.currentMonthIncome))
    const observedIncome = Math.max(0, ledgerInflows)

    const syntheticIncome = Math.max(
      approxGrossIncome,
      reportedGross,
      observedIncome,
      monthlySummaryIncome * 12
    ) || 900000

    const monthlySummaryExpenses = Math.max(0, pickNumeric(summary?.currentMonthExpenses))
    const observedExpenses = Math.max(0, ledgerOutflows)
    const syntheticExpenses = Math.max(
      approxGrossIncome > 0 ? approxGrossIncome * 0.55 : 0,
      observedExpenses,
      monthlySummaryExpenses * 12,
      syntheticIncome * 0.5
    )

    const estimatedDeductions = Math.min(Math.max(120000, syntheticIncome * 0.4), syntheticExpenses * 0.45, 600000)
    const taxableIncome = Math.max(0, syntheticIncome - estimatedDeductions - 50000)
    if (taxableIncome <= 0) return []
    const oldEstimate = Math.round(taxableIncome * 0.24)
    const newEstimate = Math.round(taxableIncome * 0.19)

    return [
      {
        label: "Old regime",
        regime: "old",
        amount: oldEstimate,
        fill: "#fb7185",
        note: `Estimated deductions ${formatCurrency(Math.round(estimatedDeductions))} based on ledger and modelled expenses.`,
        recommended: oldEstimate <= newEstimate,
      },
      {
        label: "New regime",
        regime: "new",
        amount: newEstimate,
        fill: "#38bdf8",
        note: "Includes standard deduction ₹50,000 (estimated).",
        recommended: newEstimate < oldEstimate,
      },
    ]
  }, [approxGrossIncome, hasRealTaxData, ledgerInflows, ledgerOutflows, summary?.currentMonthExpenses, summary?.currentMonthIncome])

  const usingFallbackTax = !hasRealTaxData && ledgerFallbackTaxBars.length > 0
  const baseTaxBars = usingFallbackTax ? ledgerFallbackTaxBars : taxBars.length ? taxBars : ledgerFallbackTaxBars

  const syntheticTaxSource = taxData?.meta?.syntheticSource ?? (usingFallbackTax ? "ledger_estimate" : null)
  const isSyntheticTax = Boolean(taxData?.meta?.synthetic || usingFallbackTax)
  const syntheticTaxLabel = syntheticTaxSource ? normaliseLabel(syntheticTaxSource) : usingFallbackTax ? "Ledger Estimate" : null

  const fallbackDeductionBreakdown = useMemo(() => {
    if (!usingFallbackTax) return null
    const est80C = Math.round(Math.min(ledgerOutflows * 0.18, 150000))
    const est80D = Math.round(Math.min(ledgerOutflows * 0.08, 75000))
    const est80G = Math.round(Math.min(ledgerOutflows * 0.05, 200000))
    const est24B = Math.round(Math.min(ledgerOutflows * 0.2, 200000))
    const standardDeduction = 50000
    return {
      section80C: est80C,
      section80D: est80D,
      section80G: est80G,
      section24B: est24B,
      standardDeduction,
      oldRegime: est80C + est80D + est80G + est24B,
    }
  }, [usingFallbackTax, ledgerOutflows])

  const fallbackIncomeBreakdown = useMemo(() => {
    if (!usingFallbackTax) return null
    const total = Math.max(ledgerInflows, 0)
    if (total <= 0) return null
    const salary = Math.round(total * 0.5)
    const capitalGains = Math.round(total * 0.15)
    const other = Math.max(0, total - salary - capitalGains)
    return { salary, capitalGains, other }
  }, [usingFallbackTax, ledgerInflows])

  const grossIncome = usingFallbackTax
    ? Math.max(0, Math.round(ledgerInflows))
    : Math.max(0, Math.round(pickNumeric(taxData?.grossIncome, taxData?.meta?.totalIncomeFromTx)))

  const incomeBreakdown = fallbackIncomeBreakdown ?? baseIncomeBreakdown
  const deductionBreakdown = fallbackDeductionBreakdown ?? taxData?.deductionBreakdown ?? {}

  const hasTaxProjection = baseTaxBars.some((bar) => (bar.amount ?? 0) > 0)
  const displayTaxBars = hasTaxProjection ? baseTaxBars : baseTaxBars.map((bar) => ({ ...bar, placeholder: true }))
  const taxChartData = displayTaxBars.map((bar) => {
    const rawAmount = bar.amount
    const magnitude = bar.placeholder ? 1 : Math.max(1, Math.abs(rawAmount))
    return {
      ...bar,
      rawAmount,
      amount: magnitude,
    }
  })
  const maxTaxAmount = hasTaxProjection ? Math.max(...taxChartData.map((bar) => bar.amount), 1) : 1
  const oldRegimeEstimate = baseTaxBars.find((bar) => bar.regime === "old")?.amount ?? 0
  const newRegimeEstimate = baseTaxBars.find((bar) => bar.regime === "new")?.amount ?? 0
  const recommendedRegimeKey = hasRealTaxData
    ? taxData?.recommendation?.regime?.toLowerCase?.() ?? (oldRegimeEstimate <= newRegimeEstimate ? "old" : "new")
    : oldRegimeEstimate <= newRegimeEstimate
      ? "old"
      : "new"
  const recommendedRegimeLabel = recommendedRegimeKey ? recommendedRegimeKey.toUpperCase() : null
  const taxSavings = Math.max(0, Math.round(Math.abs(oldRegimeEstimate - newRegimeEstimate)))
  const taxDifference = oldRegimeEstimate - newRegimeEstimate
  const recommendationMessage = taxData?.recommendation?.message
    ?? (usingFallbackTax && taxSavings > 0
      ? `Switch to the ${recommendedRegimeLabel} regime to save ${formatCurrency(taxSavings)} based on current ledger inflows.`
      : null)

  const handleDownloadReport = async () => {
    if (downloadingReport) return
    setDownloadingReport(true)
    setDownloadError(null)
    try {
      const response = await fetchWithAuth(`${API_BASE}/reports/analytics`, { method: "GET" })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.message || "Failed to generate report")
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `taxwise-analytics-report-${new Date().toISOString().split("T")[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      setDownloadError(error.message)
    }
    setDownloadingReport(false)
  }

  const noOverviewData = !loadingSummary && !summary

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="flex w-full max-w-xl flex-wrap gap-2 rounded-full border border-white/20 bg-white/70 p-1 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
        <TabsTrigger
          value="overview"
          className="flex-1 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
        >
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="tax"
          className="flex-1 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
        >
          Tax Engine
        </TabsTrigger>
        <TabsTrigger
          value="advisor"
          className="flex-1 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 transition data-[state=active]:bg-white data-[state=active]:text-slate-900 dark:text-slate-300 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-white"
        >
          Advisor Feed
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6 focus-visible:outline-none">
        {(loadingSummary || loadingTrends || loadingTransactions) && <LoadingState />}

        {noOverviewData && (
          <Card className="rounded-[36px] border-dashed border-white/20 bg-white/75 p-6 text-sm text-slate-500 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300">
            Upload ledgers to populate analytics.
          </Card>
        )}

        {!noOverviewData && (
          <>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_80px_-40px_rgba(15,23,42,0.7)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Performance snapshot</CardTitle>
                      <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                        Ledger telemetry · {observationLabel}
                      </CardDescription>
                    </div>
                    {summary?.healthStatus && (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em]",
                          summary.healthScore >= 80
                            ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : summary.healthScore >= 60
                              ? "bg-sky-500/15 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300"
                              : "bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300"
                        )}
                      >
                        {summary.healthStatus}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {loadingSummary ? (
                    <SnapshotSkeleton />
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {insightTiles.map((tile) => {
                        const tone = tile.tone ?? "sky"
                        const toneConfig = {
                          emerald: {
                            badge: "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
                            glow: "from-emerald-400/40 via-teal-300/10 to-transparent",
                            value: "text-emerald-600 dark:text-emerald-200",
                            label: "Strong",
                            outline: "border-emerald-400/30 dark:border-emerald-400/25",
                          },
                          rose: {
                            badge: "bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300",
                            glow: "from-rose-400/40 via-amber-300/10 to-transparent",
                            value: "text-rose-600 dark:text-rose-200",
                            label: "Watch",
                            outline: "border-rose-400/30 dark:border-rose-400/25",
                          },
                          sky: {
                            badge: "bg-sky-500/15 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300",
                            glow: "from-sky-400/40 via-cyan-300/10 to-transparent",
                            value: "text-slate-900 dark:text-white",
                            label: "Steady",
                            outline: "border-sky-400/30 dark:border-sky-400/25",
                          },
                        }
                        const paletteTone = toneConfig[tone] ?? toneConfig.sky
                        return (
                          <div
                            key={tile.title}
                            className="group relative overflow-hidden rounded-[28px] border border-white/20 bg-white/75 p-5 shadow-sm ring-offset-2 transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_-32px_rgba(14,165,233,0.65)] dark:border-slate-700/60 dark:bg-slate-900/70"
                          >
                            <div
                              className={cn(
                                "pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                                "bg-gradient-to-br",
                                paletteTone.glow
                              )}
                            />
                            <div className="flex h-full flex-col gap-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                                  {tile.title}
                                </p>
                                <span
                                  className={cn(
                                    "shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]",
                                    paletteTone.badge
                                  )}
                                >
                                  {paletteTone.label}
                                </span>
                              </div>
                              <p className={cn("text-3xl font-semibold", paletteTone.value)}>{tile.value}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">{tile.detail}</p>
                              {tile.accent && (
                                <div
                                  className={cn(
                                    "rounded-2xl border border-dashed px-3 py-2 text-[11px] font-medium text-slate-500 dark:text-slate-400",
                                    "bg-white/70 dark:bg-slate-900/60",
                                    paletteTone.outline
                                  )}
                                >
                                  {tile.accent}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {!loadingSummary && healthBreakdown.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                        Health score breakdown
                      </p>
                      <HealthBreakdown breakdown={healthBreakdown} />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_80px_-40px_rgba(15,23,42,0.7)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
                <CardHeader className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Category mix</CardTitle>
                    <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                      Share of spending & inflows · {observationLabel}
                    </CardDescription>
                  </div>
                  <BadgeCheck className="h-5 w-5 text-emerald-400" />
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6">
                  <AnimatedPie
                    segments={pieSegments}
                    activeLabel={activeSlice}
                    observationLabel={observationLabel}
                    onSegmentFocus={setActiveSlice}
                    onSegmentSelect={setActiveSlice}
                  />
                  {hasSyntheticCategory && (
                    <p className="max-w-md text-center text-[11px] text-slate-500 dark:text-slate-400">
                      Modelled inflows derived from ledger totals are included to balance the mix. Upload categorised credits to replace the placeholder slice.
                    </p>
                  )}
                  <div className="w-full max-w-md rounded-[28px] border border-white/20 bg-white/80 px-5 py-5 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80">
                    <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      <span>Focus category</span>
                      {typeof activeSegment?.count === "number" && activeSegment.count > 0 && (
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                          {activeSegment.count} entries
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{activeSlice}</p>
                    {activeSegment?.synthetic && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-600 dark:bg-sky-500/20 dark:text-sky-200">
                        Modelled
                      </span>
                    )}
                    <div className="mt-4 grid grid-cols-3 gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200">
                        <p className="text-[10px] uppercase tracking-[0.18em]">Inflows</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(activeSegment?.credit ?? 0)}
                        </p>
                        {activeInflowShare > 0 && (
                          <p className="text-[10px] text-emerald-500/80 dark:text-emerald-200/70">{activeInflowShare}% share</p>
                        )}
                      </div>
                      <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200">
                        <p className="text-[10px] uppercase tracking-[0.18em]">Outflows</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(activeSegment?.debit ?? 0)}
                        </p>
                        {activeOutflowShare > 0 && (
                          <p className="text-[10px] text-rose-500/80 dark:text-rose-200/70">{activeOutflowShare}% share</p>
                        )}
                      </div>
                      <div className="rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2 text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300">
                        <p className="text-[10px] uppercase tracking-[0.18em]">Net</p>
                        {typeof activeSegment?.net === "number" ? (
                          <p
                            className={cn(
                              "text-sm font-semibold",
                              activeSegment.net >= 0
                                ? "text-emerald-600 dark:text-emerald-200"
                                : "text-rose-500 dark:text-rose-300"
                            )}
                          >
                            {activeSegment.net >= 0
                              ? `+₹${activeSegment.net.toLocaleString()}`
                              : `-₹${Math.abs(activeSegment.net).toLocaleString()}`}
                          </p>
                        ) : (
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">—</p>
                        )}
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">Across {observationDescriptor}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid w-full gap-3">
                    {pieSegments.map((segment) => {
                      const inflowSharePct = Math.round((segment.shareOfInflows ?? 0) * 100)
                      const outflowSharePct = Math.round((segment.shareOfOutflows ?? 0) * 100)
                      const totalValue = Math.max(0, segment.credit) + Math.max(0, segment.debit)
                      const isActive = segment.label === activeSlice
                      return (
                        <button
                          key={segment.label}
                          type="button"
                          onClick={() => setActiveSlice(segment.label)}
                          className={cn(
                            "flex flex-col gap-2 rounded-[24px] border px-4 py-3 text-left transition",
                            "border-white/20 bg-white/75 text-sm shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70",
                            isActive ? "ring-1 ring-sky-400/50 dark:ring-sky-400/40" : "hover:shadow-[0_20px_40px_-32px_rgba(14,165,233,0.55)]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                              <div className="space-y-1">
                                <p
                                  className="max-w-[180px] truncate text-sm font-semibold text-slate-900 dark:text-white"
                                  title={segment.label}
                                >
                                  {segment.label}
                                </p>
                                {segment.synthetic && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-600 dark:bg-sky-500/20 dark:text-sky-200">
                                    Modelled
                                  </span>
                                )}
                                <p
                                  className="max-w-[200px] truncate text-[11px] text-slate-500 dark:text-slate-400"
                                  title={`₹${totalValue.toLocaleString()} total${segment.count > 0 ? ` · ${segment.count} entries` : ""}`}
                                >
                                  ₹{totalValue.toLocaleString()} total
                                  {segment.count > 0 ? ` · ${segment.count} entries` : ""}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                            <span
                              className="inline-flex max-w-[48%] items-center gap-1 truncate text-emerald-600 dark:text-emerald-300"
                              title={`Inflow ₹${(segment.credit ?? 0).toLocaleString()}`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                              In ₹{(segment.credit ?? 0).toLocaleString()}
                              {inflowSharePct > 0 && (
                                <span className="text-[10px] text-emerald-500/70 dark:text-emerald-200/70">({inflowSharePct}%)</span>
                              )}
                            </span>
                            <span
                              className="inline-flex max-w-[48%] items-center gap-1 truncate text-rose-500 dark:text-rose-300"
                              title={`Outflow ₹${(segment.debit ?? 0).toLocaleString()}`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-400/80" />
                              Out ₹{(segment.debit ?? 0).toLocaleString()}
                              {outflowSharePct > 0 && (
                                <span className="text-[10px] text-rose-500/70 dark:text-rose-200/70">({outflowSharePct}%)</span>
                              )}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/60">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.max(6, outflowSharePct)}%`, backgroundColor: segment.color }}
                            />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_80px_-40px_rgba(15,23,42,0.7)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
                <CardHeader className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Ledger contributions</CardTitle>
                    <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                      Top statements powering the workspace this quarter
                    </CardDescription>
                  </div>
                  <BadgeCheck className="h-5 w-5 text-emerald-400" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {ingestionBreakdown.length === 0 && (
                    <div className="flex flex-col items-center gap-3 rounded-[28px] border border-dashed border-slate-300/60 bg-white/70 p-6 text-center text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-400">
                      <Sparkles className="h-6 w-6 text-sky-400" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-200">No ledger contributions yet</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Import bank statements or sales ledgers to unlock contribution analytics.
                      </p>
                    </div>
                  )}
                  {ingestionBreakdown.length > 0 && (
                    <>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Auto-updates after every statement upload; values reflect the latest synced ledger window.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/20 bg-white/75 px-4 py-3 text-sm shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Outflows</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(ledgerOutflows)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/20 bg-white/75 px-4 py-3 text-sm shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Inflows</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(ledgerInflows)}</p>
                        </div>
                        <div className="rounded-2xl border border-white/20 bg-white/75 px-4 py-3 text-sm shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Net impact</p>
                          <p
                            className={cn(
                              "mt-1 text-lg font-semibold",
                              ledgerNet >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-500 dark:text-rose-300"
                            )}
                          >
                            {formatCurrency(ledgerNet)}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            {ledgerNet >= 0 ? "Surplus captured" : "Shortfall observed"}
                          </p>
                        </div>
                      </div>
                      {ingestionBreakdown.map((entry) => {
                        const inflowSharePct = Math.round((entry.shareOfInflows ?? 0) * 100)
                        const outflowSharePct = Math.round((entry.shareOfOutflows ?? 0) * 100)
                        const netValue = entry.net ?? entry.credit - entry.debit
                        return (
                          <div
                            key={entry.label}
                            className="rounded-[28px] border border-white/20 bg-white/75 p-5 shadow-sm transition-shadow hover:shadow-[0_24px_55px_-34px_rgba(14,165,233,0.55)] dark:border-slate-700/60 dark:bg-slate-900/70"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{entry.label}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  ₹{(entry.debit + entry.credit).toLocaleString()} processed
                                  {entry.count > 0 ? ` · ${entry.count} filings` : ""}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]",
                                  netValue >= 0
                                    ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                                    : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
                                )}
                              >
                                {netValue >= 0
                                  ? `Net +₹${netValue.toLocaleString()}`
                                  : `Net -₹${Math.abs(netValue).toLocaleString()}`}
                              </span>
                            </div>
                            <div className="mt-4 grid gap-3 text-[11px] sm:grid-cols-2">
                              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200">
                                <p className="text-[10px] uppercase tracking-[0.18em]">Inflows</p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                  ₹{entry.credit.toLocaleString()}
                                </p>
                                {inflowSharePct > 0 && (
                                  <p className="text-[10px] text-emerald-500/80 dark:text-emerald-200/70">{inflowSharePct}% share</p>
                                )}
                              </div>
                              <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-200">
                                <p className="text-[10px] uppercase tracking-[0.18em]">Outflows</p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                  ₹{entry.debit.toLocaleString()}
                                </p>
                                {outflowSharePct > 0 && (
                                  <p className="text-[10px] text-rose-500/80 dark:text-rose-200/70">{outflowSharePct}% share</p>
                                )}
                              </div>
                            </div>
                            <div className="mt-4 space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                <span>Outflow share</span>
                                <span>{outflowSharePct}%</span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/60">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-rose-400 via-sky-400 to-emerald-400"
                                  style={{ width: `${Math.max(6, outflowSharePct)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_80px_-40px_rgba(15,23,42,0.7)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
                <CardHeader className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Filing velocity</CardTitle>
                    <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                      Interactive view of throughput and automation coverage
                    </CardDescription>
                  </div>
                  <Sparkles className="h-5 w-5 text-purple-400" />
                </CardHeader>
                <CardContent className="space-y-6">
                  <FilingVelocityChart
                    series={chartSeries}
                    observationLabel={observationLabel}
                    fallbackIncome={fallbackVelocityIncome}
                    fallbackExpenses={fallbackVelocityExpenses}
                  />
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_80px_-40px_rgba(15,23,42,0.7)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
              <CardHeader className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Pipeline cohorts</CardTitle>
                  <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                    Compare filing efficiency across time horizons
                  </CardDescription>
                </div>
                <PieChart className="h-5 w-5 text-sky-500" />
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="quarter" className="space-y-6">
                  <TabsList className="inline-flex rounded-full bg-slate-200/60 p-1 dark:bg-slate-800/70">
                    {cohortTabs.map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em]"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {cohortTabs.map((tab) => (
                    <TabsContent key={tab.value} value={tab.value} className="space-y-4">
                      {tab.data.map((row) => {
                        const change = row.change?.toString?.() ?? ""
                        const trimmed = change.trim()
                        const isPositive = trimmed.startsWith("+")
                        const isNegative = trimmed.startsWith("-")
                        const toneClass = isPositive
                          ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
                          : isNegative
                            ? "bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300"
                            : "bg-slate-200/60 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
                        const Icon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Sparkles
                        return (
                          <div
                            key={row.metric}
                            className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/20 bg-white/70 px-5 py-4 text-sm shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-32px_rgba(14,165,233,0.55)] dark:border-slate-700/60 dark:bg-slate-900/70"
                          >
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">{row.metric}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{row.detail || "Optimised segment"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-slate-900 dark:text-white">{row.value}</p>
                              <span
                                className={cn(
                                  "mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em]",
                                  toneClass
                                )}
                              >
                                <Icon className="h-3 w-3" />
                                {row.change || "Flat"}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>

      <TabsContent value="tax" className="space-y-6 focus-visible:outline-none">
        {(loadingTax || displayTaxBars.length > 0) ? (
          <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_80px_-40px_rgba(15,23,42,0.7)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
            <CardHeader className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Tax optimisation engine</CardTitle>
                <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  Old vs new regime simulation with applied deductions
                </CardDescription>
              </div>
              <BarChart3 className="h-5 w-5 text-sky-500" />
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingTax && (
                <p className="text-xs text-slate-500 dark:text-slate-400">Loading tax simulation…</p>
              )}
              {!loadingTax && displayTaxBars.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    {displayTaxBars.map((bar) => {
                      const amount = Math.max(0, bar.amount)
                      const width = Math.min(100, Math.max(8, Math.round((amount / Math.max(maxTaxAmount, 1)) * 100)))
                      const showSyntheticBadge = isSyntheticTax && bar.regime === "old"

                      return (
                        <div key={`summary-${bar.label}`} className="flex flex-col items-center gap-3">
                          {showSyntheticBadge && (
                            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-600 dark:border-amber-400/30 dark:bg-amber-500/20 dark:text-amber-200">
                              Modelled insight
                              {syntheticTaxLabel && (
                                <span className="font-normal tracking-[0.12em] text-amber-500 dark:text-amber-200/80">{syntheticTaxLabel}</span>
                              )}
                            </span>
                          )}
                          {bar.recommended && recommendedRegimeLabel && (
                            <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-500/20 dark:text-emerald-200">
                              <span>Preferred: {recommendedRegimeLabel}</span>
                              {taxSavings > 0 && (
                                <span className="text-xs font-normal text-emerald-500 dark:text-emerald-200">
                                  Saves {formatCurrency(taxSavings)}
                                </span>
                              )}
                            </div>
                          )}
                          <div
                            className={cn(
                              "w-full rounded-3xl border px-5 py-4 shadow-sm transition-colors",
                              "border-white/25 bg-white/85 dark:border-slate-700/60 dark:bg-slate-900/70",
                              bar.recommended ? "ring-1 ring-emerald-400/60 dark:ring-emerald-400/40" : ""
                            )}
                          >
                            <div className="text-center">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{bar.label}</p>
                              {!bar.placeholder && (
                                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                  {bar.regime === "old" ? "Old regime" : "New regime"}
                                </p>
                              )}
                            </div>
                            <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
                              {bar.placeholder ? "Awaiting data" : formatCurrency(Math.max(0, bar.amount ?? 0))}
                            </p>
                            <div className="mt-3 h-2 w-full rounded-full bg-slate-200/70 dark:bg-slate-800/70">
                              {!bar.placeholder && (
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    bar.regime === "old"
                                      ? "bg-gradient-to-r from-rose-400 via-amber-300 to-orange-300"
                                      : "bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300"
                                  )}
                                  style={{ width: `${width}%` }}
                                />
                              )}
                            </div>
                            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                              {bar.placeholder ? "Connect salary and deduction statements to calculate this regime." : bar.note}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {hasTaxProjection && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-[11px] text-sky-700 shadow-sm dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-200">
                        {taxDifference === 0
                          ? "Both regimes yield similar tax outgo with current data."
                          : taxDifference > 0
                            ? `New regime trims tax by ${formatCurrency(Math.abs(taxDifference))}.`
                            : `Old regime trims tax by ${formatCurrency(Math.abs(taxDifference))}.`}
                      </div>
                      {taxSavings > 0 && recommendedRegimeLabel && (
                        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-[11px] text-emerald-700 shadow-sm dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200">
                          Switching to the {recommendedRegimeLabel} regime saves {formatCurrency(taxSavings)} versus the alternative.
                        </div>
                      )}
                    </div>
                  )}

                  {!hasTaxProjection && (
                    <div className="rounded-2xl border border-dashed border-slate-300/70 bg-white/75 px-4 py-3 text-xs text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-400">
                      Sync payroll credits or deduction proofs to visualise personalised tax outcomes for each regime.
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  We need income inflow data to compare regimes. Sync salary or business credits to simulate taxes.
                </p>
              )}

              {!loadingTax && grossIncome > 0 && (
                <div className="grid gap-3 rounded-3xl border border-white/20 bg-white/70 p-4 text-xs text-slate-500 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-white">
                    <span>Gross income modelled</span>
                    <span>{formatCurrency(grossIncome)}</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Income mix</p>
                      <div className="mt-1 space-y-1">
                        {[
                          { label: "Salary", value: incomeBreakdown.salary },
                          { label: "Other", value: incomeBreakdown.other },
                          { label: "Capital gains", value: incomeBreakdown.capitalGains },
                        ]
                          .map((item) => ({ ...item, numeric: Math.max(0, pickNumeric(item.value)) }))
                          .filter((item) => item.numeric > 0)
                          .map((item) => (
                            <p key={item.label} className="flex items-center justify-between">
                              <span>{item.label}</span>
                              <span>{formatCurrency(item.numeric)}</span>
                            </p>
                          ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                        Deductions applied
                      </p>
                      <div className="mt-1 space-y-1">
                        {[
                          { label: "Standard deduction", value: deductionBreakdown.standardDeduction },
                          { label: "Section 80C", value: deductionBreakdown.section80C },
                          { label: "Section 80D", value: deductionBreakdown.section80D },
                          { label: "Section 80G", value: deductionBreakdown.section80G },
                          { label: "Section 24(b)", value: deductionBreakdown.section24B },
                          { label: "Other deductions", value: deductionBreakdown.otherDeductions },
                          { label: "Old regime total", value: deductionBreakdown.oldRegime },
                        ]
                          .map((item) => ({ ...item, numeric: Math.max(0, pickNumeric(item.value)) }))
                          .filter((item) => item.numeric > 0)
                          .map((item) => (
                            <p key={item.label} className="flex items-center justify-between">
                              <span>{item.label}</span>
                              <span>{formatCurrency(item.numeric)}</span>
                            </p>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {recommendationMessage && (
                <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200">
                  {recommendationMessage}
                </div>
              )}

              {Array.isArray(taxData?.recommendations) && taxData.recommendations.length > 0 && (
                <div className="rounded-3xl border border-white/20 bg-white/80 p-4 text-xs text-slate-600 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                    Tax advisor insights
                  </p>
                  <div className="mt-3 space-y-2">
                    {taxData.recommendations.map((insight, index) => (
                      <div
                        key={`${insight.category ?? "insight"}-${index}`}
                        className="space-y-1 rounded-2xl border border-white/30 bg-white/70 px-3 py-2 dark:border-slate-700/60 dark:bg-slate-900/70"
                      >
                        {insight.category && (
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{insight.category}</p>
                        )}
                        {insight.message && <p>{insight.message}</p>}
                        {typeof insight.potential_saving === "number" && insight.potential_saving > 0 && (
                          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
                            Potential savings {formatCurrency(insight.potential_saving)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-[36px] border-dashed border-white/20 bg-white/70 p-6 text-sm text-slate-500 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300">
            Connect income sources to view tax regime comparisons.
          </Card>
        )}
      </TabsContent>

      <TabsContent value="advisor" className="space-y-6 focus-visible:outline-none">
        {(insightsList.length > 0 || alertsList.length > 0) ? (
          <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_80px_-40px_rgba(15,23,42,0.7)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
            <CardHeader className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Insights & alerts</CardTitle>
                <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  Generated from dashboard summary and filing engine
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-white/40 bg-white/70 dark:border-slate-700/60 dark:bg-slate-900/60"
                onClick={handleDownloadReport}
                disabled={downloadingReport}
              >
                {downloadingReport ? "Generating…" : "Download report"}
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {downloadError && (
                <p className="md:col-span-2 text-xs text-rose-500">{downloadError}</p>
              )}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Highlights</p>
                {highlightItems.length === 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">No insights yet.</p>
                )}
                {highlightItems.map((item, index) => (
                  <div
                    key={`${item.message}-${index}`}
                    className="flex items-start gap-3 rounded-3xl border border-white/20 bg-white/70 p-4 text-sm shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70"
                  >
                    {item.type === "signal" ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                    ) : (
                      <Lightbulb className="mt-0.5 h-4 w-4 text-sky-500" />
                    )}
                    <span className="text-slate-600 dark:text-slate-200">{item.message}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Alerts</p>
                {alertsList.length === 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">No alerts triggered.</p>
                )}
                {alertsList.map((alert) => (
                  <div
                    key={alert.message}
                    className={cn(
                      "rounded-3xl border p-4 text-sm shadow-sm",
                      "bg-white/70 dark:bg-slate-900/70",
                      alert.type === "error"
                        ? "border-rose-400/60 text-rose-600 dark:border-rose-400/40 dark:text-rose-300"
                        : alert.type === "warning"
                          ? "border-amber-400/60 text-amber-600 dark:border-amber-400/40 dark:text-amber-200"
                          : "border-white/20 text-slate-600 dark:border-slate-700/60 dark:text-slate-200"
                    )}
                  >
                    <p className="font-semibold text-slate-900 dark:text-white">{normaliseLabel(alert.category)}</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{alert.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-[36px] border-dashed border-white/20 bg-white/70 p-6 text-sm text-slate-500 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300">
            No alerts yet. Sync more ledgers or rerun filings to populate advisor insights.
          </Card>
        )}
      </TabsContent>
    </Tabs>
  )
}

export default DashboardAnalytics
