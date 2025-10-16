'use client'

import React, { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  GaugeCircle,
  TrendingUp,
  Loader2,
  AlertTriangle,
  X,
  Sparkles,
  ShieldCheck,
  ChevronDown,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import { useDashboardSummary, useTransactionsList } from "../../hooks/useDashboardApi"
import { useCreditAdvisor } from "../../hooks/useCreditAdvisor"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { cn } from "../../lib/utils"
import ReactMarkdown from "react-markdown"

const metricIcons = [FileText, CheckCircle2, TrendingUp, GaugeCircle]
const MotionDiv = motion.div

const formatCurrency = (value = 0) => `₹${Math.round(value).toLocaleString()}`
const LoadingGrid = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="h-32 rounded-3xl border border-white/10 bg-white/70 animate-pulse dark:border-slate-700/60 dark:bg-slate-900/70" />
    ))}
  </div>
)

const RecentActivitySkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/20 bg-white/70 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
        <div className="h-10 w-40 animate-pulse rounded-full bg-slate-200/60 dark:bg-slate-800/60" />
        <div className="flex gap-3">
          <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200/60 dark:bg-slate-800/60" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200/60 dark:bg-slate-800/60" />
        </div>
      </div>
    ))}
  </div>
)

const commandPalettes = [
  {
    border: "border-sky-400/30",
    background: "bg-gradient-to-br from-sky-500/10 via-cyan-400/10 to-emerald-400/10",
    iconColor: "text-sky-500",
  },
  {
    border: "border-amber-400/30",
    background: "bg-gradient-to-br from-amber-400/15 via-orange-400/10 to-rose-400/10",
    iconColor: "text-amber-500",
  },
  {
    border: "border-purple-400/25",
    background: "bg-gradient-to-br from-purple-500/15 via-indigo-500/10 to-sky-500/10",
    iconColor: "text-purple-500",
  },
]

const advisorToneStyles = {
  neutral: {
    container:
      "border-white/20 bg-white/70 dark:border-slate-700/60 dark:bg-slate-900/70",
    title: "text-slate-900 dark:text-white",
    summary: "text-slate-500 dark:text-slate-400",
  },
  positive: {
    container: "border-emerald-400/30 bg-emerald-500/10 dark:border-emerald-400/30 dark:bg-emerald-500/15",
    title: "text-emerald-700 dark:text-emerald-200",
    summary: "text-emerald-700/70 dark:text-emerald-100/80",
  },
  alert: {
    container: "border-rose-400/30 bg-rose-500/10 dark:border-rose-400/30 dark:bg-rose-500/15",
    title: "text-rose-600 dark:text-rose-200",
    summary: "text-rose-600/80 dark:text-rose-100/80",
  },
}

const ExpandableAdvisorItem = ({
  title,
  summary,
  detail,
  meta,
  tone = "neutral",
}) => {
  const [open, setOpen] = useState(false)

  const styles = advisorToneStyles[tone] ?? advisorToneStyles.neutral

  return (
    <div
      className={cn(
        "rounded-2xl border transition-colors",
        styles.container,
        open ? "shadow-sm" : ""
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
      >
        <div className="space-y-1">
          <p className={cn("text-sm font-semibold", styles.title)}>{title}</p>
          {summary && <p className={cn("text-xs", styles.summary)}>{summary}</p>}
          {meta && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              {meta}
            </p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-500 transition-transform dark:text-slate-300",
            open ? "rotate-180" : ""
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && detail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden px-3 pb-3"
          >
            <ReactMarkdown className="markdown-body text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {detail}
            </ReactMarkdown>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const DashboardOverview = () => {
  const navigate = useNavigate()
  const { data: summaryData, loading: loadingSummary } = useDashboardSummary()
  const { data: transactionsData, loading: loadingTransactions } = useTransactionsList({ limit: 5 })
  const {
    advisor: creditAdvisor,
    profile: creditProfile,
    loading: loadingAdvisor,
    error: creditAdvisorError,
  } = useCreditAdvisor()
  const [plannerOpen, setPlannerOpen] = useState(false)

  const summary = summaryData?.summary
  const changeData = summaryData?.changes
  const hasTransactions = Boolean(
    (summary?.currentMonthIncome ?? 0) > 0 ||
      (summary?.currentMonthExpenses ?? 0) > 0 ||
      (summary?.monthlyNetFlow ?? 0) !== 0
  )

  const overviewMetrics = useMemo(() => {
    if (!summary) return []

    const formatChange = (value, fallbackText) => {
      if (value === undefined || value === null || Number.isNaN(value)) return fallbackText
      if (!hasTransactions) {
        return "Awaiting comparison data"
      }
      const rounded = Math.round(value * 10) / 10
      if (rounded === 0) {
        return "No change vs last month"
      }
      return `${rounded > 0 ? "+" : ""}${rounded}% since last month`
    }

    const descriptors = [
      {
        label: "Monthly income",
        value: formatCurrency(summary.currentMonthIncome),
        delta: formatChange(changeData?.incomeChange, "Awaiting income data"),
      },
      {
        label: "Monthly expenses",
        value: formatCurrency(summary.currentMonthExpenses),
        delta: formatChange(changeData?.expenseChange, "Awaiting expense data"),
      },
      {
        label: "Net savings",
        value: formatCurrency(summary.monthlyNetFlow),
        delta: hasTransactions
          ? `${summary.savingsRate ?? 0}% savings rate`
          : "Savings rate updates after first sync",
      },
      {
        label: "Financial health",
        value: `${summary.healthScore ?? 0}/100`,
        delta: "Composite of cash flow, credit, and tax posture",
      },
    ]
    return descriptors.map((descriptor, index) => ({
      ...descriptor,
      icon: metricIcons[index % metricIcons.length],
    }))
  }, [summary, changeData, hasTransactions])

  const recentFilings = useMemo(() => {
    const transactions = transactionsData?.transactions ?? []
    return transactions.slice(0, 5).map((transaction) => ({
      id: transaction._id,
      description: transaction.description,
      category: transaction.category,
      amount: transaction.amount,
      type: transaction.type,
      date: new Date(transaction.date),
    }))
  }, [transactionsData])

  const alerts = useMemo(() => summaryData?.alerts ?? [], [summaryData?.alerts])
  const creditWatchouts = useMemo(() => creditAdvisor?.watchouts ?? [], [creditAdvisor?.watchouts])
  const creditScore = creditProfile?.estimatedScore ?? creditProfile?.score ?? null
  const creditRange = creditProfile?.scoreRange ?? null
  const creditHeadline = creditAdvisorError?.message ?? creditAdvisor?.headline ?? creditAdvisor?.scoreOutlook ?? null
  const primaryRecommendation = creditAdvisor?.recommendations?.[0] ?? null
  const plannerTasks = useMemo(() => {
    if (alerts.length) {
      return alerts.map((task, index) => ({
        title: normaliseLabel(task.category),
        description: task.message,
        accent: commandPalettes[index % commandPalettes.length],
      }))
    }
    return [
      {
        title: "Upload fresh statements",
        description: "Sync bank, credit, or ERP feeds to unlock richer analytics.",
        accent: commandPalettes[0],
      },
      {
        title: "Review category tags",
        description: "Check AI-suggested categories for any high-value outflows.",
        accent: commandPalettes[1],
      },
      {
        title: "Try tax simulator",
        description: "Compare regimes with the latest income snapshot to spot savings.",
        accent: commandPalettes[2],
      },
    ]
  }, [alerts])

  const scoreLabel = creditScore ? `${creditScore}/900` : loadingAdvisor ? "Syncing..." : "Awaiting data"
  const rangeLabel = creditRange ?? "Connect bureau data to enrich guidance."

  const trimmedText = (value, length = 110) => {
    if (!value) return null
    const text = value.toString().trim()
    return text.length > length ? `${text.slice(0, length - 3)}...` : text
  }

  const keyFactorInsights = useMemo(() => {
    const factors = (creditAdvisor?.keyFactors ?? []).slice(0, 3)
    if (factors.length === 0) {
      return [
        {
          title: "Bring in bureau statements",
          detail: "Upload recent credit statements to surface utilisation and payment insights instantly.",
          summary: "Upload fresh credit statements to unlock utilisation and payment insights instantly.",
          tone: "neutral",
        },
      ]
    }
    return factors.map((factor) => {
      const detail = factor.detail?.toString().trim() ?? ""
      return {
        title: factor.title,
        detail,
        summary: trimmedText(detail, 140),
        tone: factor.impact === "positive" ? "positive" : factor.impact === "negative" ? "alert" : "neutral",
      }
    })
  }, [creditAdvisor?.keyFactors])

  const actionHighlights = useMemo(() => {
    const recommendations = (creditAdvisor?.recommendations ?? []).slice(0, 3)
    return recommendations.map((rec) => {
      const detail = rec.expectedImpact?.toString().trim() ?? ""
      return {
        title: rec.action,
        detail,
        summary: trimmedText(detail, 140),
        timeframe: rec.timeframe ? normaliseLabel(rec.timeframe) : null,
      }
    })
  }, [creditAdvisor?.recommendations])

  const scenarioHighlights = useMemo(() => {
    const scenarios = (creditAdvisor?.whatIfScenarios ?? []).slice(0, 2)
    return scenarios.map((scenario) => ({
      label: scenario.scenario,
      delta: scenario.expectedScoreDelta,
      note: trimmedText(scenario.steps || scenario.notes, 140),
    }))
  }, [creditAdvisor?.whatIfScenarios])

  const watchlistItems = useMemo(
    () =>
      creditWatchouts.slice(0, 3).map((item) => {
        const detail = item?.toString().trim() ?? ""
        return {
          title: trimmedText(detail, 70) || "Alert",
          detail,
          summary: trimmedText(detail, 140),
        }
      }),
    [creditWatchouts]
  )

  const handleViewAll = () => navigate("/dashboard/filings")

  return (
    <>
      <div className="space-y-6">
      {(loadingSummary || loadingTransactions) && <LoadingGrid />}

      {!loadingSummary && overviewMetrics.length > 0 && (
        <div className="space-y-3">
          {summary?.periodLabel && (
            <div className="inline-flex items-center rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-600 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-300">
              Observation window · {summary.periodLabel}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {overviewMetrics.map((metric) => (
              <Card
                key={metric.label}
                className="rounded-3xl border-white/10 bg-white/80 shadow-[0_24px_55px_-28px_rgba(15,23,42,0.65)] backdrop-blur transition-transform hover:-translate-y-1 hover:shadow-[0_28px_70px_-34px_rgba(14,165,233,0.6)] dark:border-slate-700/60 dark:bg-slate-900/70"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-300">
                    {metric.label}
                  </CardTitle>
                  <metric.icon className="h-4 w-4 text-sky-500" />
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-3xl font-semibold text-slate-900 dark:text-white">{metric.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{metric.delta}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card className="rounded-[32px] border-white/10 bg-white/90 shadow-[0_28px_70px_-38px_rgba(59,130,246,0.45)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">CIBIL score advisor</CardTitle>
            <CardDescription className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
              Gemini nudges to keep credit in the green
            </CardDescription>
          </div>
          <Sparkles className="h-5 w-5 text-sky-500" />
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,0.38fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-sky-400/30 bg-gradient-to-br from-sky-500/15 via-cyan-400/10 to-emerald-400/10 p-4 text-slate-900 shadow-sm dark:border-slate-700/60 dark:from-sky-500/20 dark:via-cyan-400/10 dark:to-emerald-400/10 dark:text-white">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">Score now</p>
                {loadingAdvisor ? <Loader2 className="h-4 w-4 animate-spin text-sky-500" /> : <ShieldCheck className="h-4 w-4 text-emerald-400" />}
              </div>
              <p className="mt-3 text-4xl font-semibold">{scoreLabel}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">{creditHeadline ? trimmedText(creditHeadline) : rangeLabel}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                {creditRange && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/30 px-2.5 py-0.5 font-semibold uppercase tracking-[0.24em] text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                    {creditRange}
                  </span>
                )}
                {primaryRecommendation && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-semibold uppercase tracking-[0.24em] text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                    {primaryRecommendation.action}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Tabs defaultValue={actionHighlights.length ? "actions" : "insights"} className="space-y-4">
            <TabsList className="bg-white/70 dark:bg-slate-900/70">
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="actions" disabled={actionHighlights.length === 0}>Next steps</TabsTrigger>
              <TabsTrigger value="alerts" disabled={watchlistItems.length === 0}>Alerts</TabsTrigger>
            </TabsList>
            <TabsContent value="insights" className="space-y-3 rounded-3xl border border-white/20 bg-white/80 p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              <h4 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Key signals</h4>
              <div className="space-y-2">
                {keyFactorInsights.map((factor, index) => (
                  <ExpandableAdvisorItem
                    key={`${factor.title}-${index}`}
                    title={factor.title}
                    summary={factor.summary}
                    detail={factor.detail}
                    tone={factor.tone}
                  />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="actions" className="space-y-3 rounded-3xl border border-white/20 bg-white/80 p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              <h4 className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Recommended moves</h4>
              {actionHighlights.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Gemini will suggest steps once credit behaviour data arrives.
                </p>
              ) : (
                <div className="space-y-2">
                  {actionHighlights.map((action, index) => (
                    <ExpandableAdvisorItem
                      key={`${action.title}-${index}`}
                      title={action.title}
                      summary={action.summary}
                      detail={action.detail}
                      meta={action.timeframe}
                      tone="positive"
                    />
                  ))}
                  {scenarioHighlights.length === 0 && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Add more bureau feeds to unlock what-if simulations.
                    </p>
                  )}
                </div>
              )}
              {scenarioHighlights.length > 0 && (
                <div className="rounded-2xl border border-sky-400/25 bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-200">
                  <p className="font-semibold">Scenario lead</p>
                  <p>{scenarioHighlights[0].label}</p>
                  <p className="text-[11px] text-sky-600/80 dark:text-sky-100/70">{scenarioHighlights[0].delta}</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="alerts" className="space-y-3 rounded-3xl border border-white/20 bg-white/80 p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              {watchlistItems.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No bureau alerts flagged right now.</p>
              ) : (
                <div className="space-y-2">
                  {watchlistItems.map((item, index) => (
                    <ExpandableAdvisorItem
                      key={`${item.title}-${index}`}
                      title={item.title}
                      summary={item.summary}
                      detail={item.detail}
                      tone="alert"
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.7)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
          <CardHeader className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Recent activity</CardTitle>
              <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                Latest filings and ledger movements
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-white/40 bg-white/70 dark:border-slate-700/60 dark:bg-slate-900/60"
              onClick={handleViewAll}
            >
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {loadingTransactions ? (
              <RecentActivitySkeleton />
            ) : recentFilings.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No filings have been recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
                {recentFilings.map((filing) => (
                  <div key={filing.id ?? filing.description} className="flex flex-wrap items-center justify-between gap-4 py-4 text-sm">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{filing.description}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{normaliseLabel(filing.category)}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "text-xs font-semibold uppercase tracking-[0.3em]",
                          filing.type === "credit" ? "text-emerald-500" : "text-rose-500"
                        )}
                      >
                        {filing.type === "credit" ? "Inflow" : "Outflow"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatCurrency(filing.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.7)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
          <CardHeader className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Command centre tasks</CardTitle>
              <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                Alerts triggered by the analytics engine
              </CardDescription>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-600 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-200">
              <AlertTriangle className="h-3 w-3" />
              {(alerts.length || plannerTasks.length) || 0} tasks
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            {alerts.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">No pending tasks. Automations are running smoothly.</p>
            )}
            {plannerTasks.map((task, index) => (
              <div
                key={`${task.title}-${index}`}
                className={cn(
                  "rounded-3xl p-4 shadow-sm transition-transform hover:-translate-y-0.5",
                  task.accent?.border ?? "border-white/25",
                  task.accent?.background ?? "bg-white/70",
                  "border"
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{task.title}</p>
                  <AlertTriangle className={cn("h-4 w-4", task.accent?.iconColor ?? "text-sky-500")} />
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">{task.description}</p>
              </div>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-300"
              onClick={() => setPlannerOpen(true)}
            >
              View planner
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
      </div>

      <AnimatePresence>
        {plannerOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
          >
            <MotionDiv
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className="relative w-full max-w-2xl rounded-4xl border border-white/20 bg-white/95 p-6 shadow-2xl dark:border-slate-700/60 dark:bg-slate-900/90"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Planner</h2>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                    Organise upcoming compliance actions
                  </p>
                </div>
                <div className="flex items-center gap-2">
                <div className="flex rounded-full border border-white/40 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300">
                  Active queue
                </div>
                  <Button size="icon" variant="ghost" onClick={() => setPlannerOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {plannerTasks.map((task, index) => (
                  <div
                    key={`planner-${task.title}-${index}`}
                    className={cn(
                      "rounded-3xl border p-4 transition-transform hover:-translate-y-0.5",
                      task.accent?.border ?? "border-sky-400/30",
                      task.accent?.background ?? "bg-white/70"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{task.title}</p>
                      <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">{task.description}</p>
                  </div>
                ))}
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </>
  )
}

const normaliseLabel = (label = "") =>
  label
    .toString()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())

export default DashboardOverview
