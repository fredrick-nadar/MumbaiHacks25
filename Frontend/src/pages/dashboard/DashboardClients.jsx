'use client'

import React, { useMemo, useState } from "react"
import { Building2, Mail, Phone, ShieldCheck, UserPlus, X } from "lucide-react"

import { useCreditHealth, useTransactionsList } from "../../hooks/useDashboardApi"
import { useAuth } from "../../contexts/AuthContext"
import { cn } from "../../lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"

const formatCurrency = (value = 0) => `₹${Math.round(value).toLocaleString()}`

const riskTone = {
  Low: "text-emerald-500",
  Medium: "text-amber-500",
  High: "text-rose-500",
}

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value))

const coerceRiskLabel = (value) => {
  if (!value) return null
  const text = value.toString().toLowerCase()
  if (text.includes('low')) return 'Low'
  if (text.includes('medium')) return 'Medium'
  if (text.includes('high')) return 'High'
  return null
}

const coerceRiskNumber = (value) => {
  if (value === undefined || value === null) return null
  const numeric = typeof value === 'string' ? Number(value) : value
  return typeof numeric === 'number' && !Number.isNaN(numeric) ? numeric : null
}

const determineRiskLevel = (metrics = {}) => {
  const labelled = coerceRiskLabel(metrics.explicitLabel)
  const labelledFromMetrics = labelled || coerceRiskLabel(metrics.explicitRisk)
  if (labelledFromMetrics) {
    const inferredScore = metrics.explicitScore ?? (labelledFromMetrics === 'Low' ? 80 : labelledFromMetrics === 'Medium' ? 60 : 35)
    return { label: labelledFromMetrics, score: clamp(inferredScore) }
  }

  const {
    inflow = 0,
    outflow = 0,
    net = inflow - outflow,
    creditCount = 0,
    debitCount = 0,
    largestDebit = 0,
    largestCredit = 0,
    lastActivityDays = Infinity,
    explicitScore,
  } = metrics

  let score = clamp(explicitScore ?? 65)

  const coverage = outflow > 0 ? inflow / outflow : inflow > 0 ? 2 : 0
  if (coverage >= 1.5) score += 12
  else if (coverage >= 1.1) score += 6
  else if (coverage < 0.9 && outflow > 0) score -= 10
  else if (coverage < 0.75 && outflow > 0) score -= 14

  if (net >= inflow * 0.15) score += 6
  else if (net < 0) score -= 8

  const totalTransactions = creditCount + debitCount
  if (totalTransactions > 0) {
    const debitSkew = debitCount / totalTransactions
    if (debitSkew >= 0.75) score -= 8
    else if (debitSkew <= 0.35) score += 6
  }

  if (largestDebit >= 250000) score -= 12
  else if (largestDebit >= 120000) score -= 8
  else if (largestDebit >= 75000) score -= 5

  if (largestCredit >= 250000) score += 6
  else if (largestCredit >= 120000) score += 3

  if (Number.isFinite(lastActivityDays)) {
    if (lastActivityDays <= 30) score += 4
    else if (lastActivityDays > 120) score -= 6
  }

  score = clamp(score)
  const label = score >= 70 ? 'Low' : score >= 50 ? 'Medium' : 'High'
  return { label, score }
}

const normalise = (label = "") => label.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())

export const DashboardClients = () => {
  const { user } = useAuth()
  const { data: transactionsData } = useTransactionsList({ limit: 50 })
  const { data: creditHealth } = useCreditHealth()

  const [manualClients, setManualClients] = useState([])
  const [clientModalOpen, setClientModalOpen] = useState(false)
  const [clientDraft, setClientDraft] = useState({
    name: "",
    email: "",
    segment: "",
    inflow: "",
    outflow: "",
    risk: "Medium",
    riskScore: "65",
  })
  const [clientFormError, setClientFormError] = useState(null)
  const [activeSegmentFilter, setActiveSegmentFilter] = useState(null)

  const transactions = useMemo(() => transactionsData?.transactions ?? [], [transactionsData?.transactions])
  const categoryStats = useMemo(() => transactionsData?.categoryStats ?? [], [transactionsData?.categoryStats])

  const derivedRoster = useMemo(() => {
    if (!transactions.length) return []

    const groups = new Map()

    transactions.forEach((transaction) => {
      const description = transaction?.description?.trim() || `Workspace client ${groups.size + 1}`
      const key = description.toLowerCase()

      if (!groups.has(key)) {
        const slug = description
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '.')
          .replace(/\.+/g, '.')
          .replace(/^\.|\.$/g, '')
        groups.set(key, {
          name: description,
          contact: `${slug || `client${groups.size + 1}`}@workspace.io`,
          categories: new Set(),
          inflow: 0,
          outflow: 0,
          creditCount: 0,
          debitCount: 0,
          maxCredit: 0,
          maxDebit: 0,
          lastActivity: null,
          explicitLabel: null,
          explicitScore: null,
        })
      }

      const group = groups.get(key)
      const amount = Math.max(0, Math.abs(transaction?.amount ?? 0))
      const txnDate = transaction?.date ? new Date(transaction.date) : null

      if (transaction?.type === 'credit') {
        group.inflow += amount
        group.creditCount += 1
        group.maxCredit = Math.max(group.maxCredit, amount)
      } else if (transaction?.type === 'debit') {
        group.outflow += amount
        group.debitCount += 1
        group.maxDebit = Math.max(group.maxDebit, amount)
      }

      if (txnDate && (!group.lastActivity || txnDate > group.lastActivity)) {
        group.lastActivity = txnDate
      }

      if (transaction?.category) {
        group.categories.add(transaction.category)
      }

      const labelled = coerceRiskLabel(transaction?.riskLevel || transaction?.risk_category || transaction?.riskFlag)
      if (labelled && !group.explicitLabel) {
        group.explicitLabel = labelled
      }

      const score = coerceRiskNumber(transaction?.riskScore ?? transaction?.score ?? transaction?.likelihood)
      if (score !== null) {
        group.explicitScore = score
      }
    })

    const now = Date.now()

    return Array.from(groups.values())
      .map((group, index) => {
        const inflow = Math.round(group.inflow)
        const outflow = Math.round(group.outflow)
        const net = inflow - outflow
        const lastActivityDays = group.lastActivity ? (now - group.lastActivity.getTime()) / 86400000 : Infinity
        const risk = determineRiskLevel({
          inflow,
          outflow,
          net,
          creditCount: group.creditCount,
          debitCount: group.debitCount,
          largestCredit: group.maxCredit,
          largestDebit: group.maxDebit,
          lastActivityDays,
          explicitLabel: group.explicitLabel,
          explicitRisk: group.explicitLabel,
          explicitScore: group.explicitScore,
        })
        const categories = Array.from(group.categories).map((value) => normalise(value))
        const segmentLabel = categories.length ? categories.slice(0, 2).join(', ') : 'General'
        const activityLabel = Number.isFinite(lastActivityDays)
          ? lastActivityDays < 1
            ? 'Today'
            : `${Math.max(1, Math.round(lastActivityDays))}d ago`
          : 'N/A'

        return {
          name: group.name || `Workspace client ${index + 1}`,
          segment: segmentLabel,
          contact: group.contact,
          owner: user?.name || 'Partner',
          risk: risk.label,
          riskScore: risk.score,
          stats: {
            inflow,
            outflow,
            net,
            activityLabel,
            totalVolume: inflow + outflow,
          },
        }
      })
      .sort((a, b) => b.stats.totalVolume - a.stats.totalVolume)
      .slice(0, 6)
  }, [transactions, user?.name])

  const segmentTiles = useMemo(() => {
    if (!categoryStats.length) return []
    return categoryStats.slice(0, 6).map((segment) => ({
      name: normalise(segment._id),
      count: segment.count,
      value: Math.round((segment.credit ?? 0) + (segment.debit ?? 0)),
    }))
  }, [categoryStats])

  const combinedRoster = useMemo(() => {
    if (!manualClients.length) return derivedRoster
    return [...manualClients, ...derivedRoster]
  }, [derivedRoster, manualClients])

  const filteredRoster = useMemo(() => {
    if (!activeSegmentFilter) return combinedRoster
    const query = activeSegmentFilter.toLowerCase()
    return combinedRoster.filter((client) => client.segment?.toLowerCase().includes(query))
  }, [activeSegmentFilter, combinedRoster])

  const riskBadge = (risk = "Low") => riskTone[risk] || "text-slate-500"

  const resetClientDraft = () => {
    setClientDraft({
      name: "",
      email: "",
      segment: "",
      inflow: "",
      outflow: "",
      risk: "Medium",
      riskScore: "65",
    })
    setClientFormError(null)
  }

  const handleClientDraftChange = (field, value) => {
    setClientFormError(null)
    setClientDraft((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddClient = (event) => {
    event?.preventDefault?.()
    const trimmedName = clientDraft.name.trim()
    if (!trimmedName) {
      setClientFormError('Client name is required.')
      return
    }

    const parseAmount = (value) => {
      if (value === null || value === undefined) return 0
      const numeric = Number(String(value).replace(/[^0-9.-]/g, ''))
      return Number.isFinite(numeric) ? Math.max(0, numeric) : 0
    }

    const inflow = parseAmount(clientDraft.inflow)
    const outflow = parseAmount(clientDraft.outflow)
    const risk = clientDraft.risk || 'Medium'
    const riskBase = risk === 'Low' ? 82 : risk === 'High' ? 42 : 64
    const riskScoreValue = Number(clientDraft.riskScore)
    const riskScore = Number.isFinite(riskScoreValue) ? Math.max(0, Math.min(100, riskScoreValue)) : riskBase
    const net = inflow - outflow
    const totalVolume = inflow + outflow
    const owner = user?.name || 'Partner'
    const fallbackSlug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '')
    const contactEmail = clientDraft.email.trim() || `${fallbackSlug || Date.now()}@taxwise.ai`

    const manualClient = {
      name: trimmedName,
      segment: clientDraft.segment.trim() || 'General',
      contact: contactEmail,
      owner,
      risk,
      riskScore,
      stats: {
        inflow,
        outflow,
        net,
        activityLabel: 'Just added',
        totalVolume,
      },
    }

    setManualClients((prev) => [manualClient, ...prev])
    setClientModalOpen(false)
    resetClientDraft()
  }

  return (
    <>
      <div className="space-y-6">
      <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_70px_-38px_rgba(15,23,42,0.68)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Client roster</CardTitle>
            <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Live view of top funding and compliance partners
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="gap-2 rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-4 text-xs font-semibold uppercase tracking-[0.28em] text-white shadow-[0_18px_45px_-28px_rgba(14,165,233,0.85)]"
            onClick={() => setClientModalOpen(true)}
          >
            <UserPlus className="h-3.5 w-3.5" />
            New client
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeSegmentFilter && (
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-600 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-200">
              Segment filter · {activeSegmentFilter}
              <button
                type="button"
                className="rounded-full bg-transparent text-[10px] font-medium uppercase tracking-[0.24em] text-sky-500 hover:text-sky-700 dark:text-sky-200"
                onClick={() => setActiveSegmentFilter(null)}
              >
                Clear
              </button>
            </div>
          )}
          {filteredRoster.length === 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeSegmentFilter
                ? `No clients mapped to "${activeSegmentFilter}" yet.`
                : "Upload statements to populate client profiles."}
            </p>
          )}
          {filteredRoster.map((client) => (
            <div key={`${client.name}-${client.contact}`} className="rounded-3xl border border-white/20 bg-white/70 p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{client.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{client.segment}</p>
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold uppercase tracking-[0.28em]",
                    riskBadge(client.risk)
                  )}
                  title={`Risk score ${Math.round(client.riskScore)} / 100`}
                >
                  {client.risk} risk · {Math.round(client.riskScore)}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {client.contact}</span>
                <span className="inline-flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Relationship: {client.owner}</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> Compliance guard active</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                  In {formatCurrency(client.stats.inflow)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                  Out {formatCurrency(client.stats.outflow)}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
                    client.stats.net >= 0
                      ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300'
                  )}
                >
                  Net {client.stats.net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(client.stats.net))}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-2.5 py-1 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                  Last active {client.stats.activityLabel}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_70px_-38px_rgba(15,23,42,0.68)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Segments</CardTitle>
            <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Distribution by category and spend value
            </CardDescription>
          </div>
          <Building2 className="h-5 w-5 text-sky-500" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {segmentTiles.length === 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">No category insights yet.</p>
          )}
          {segmentTiles.map((segment) => {
            const isActive = activeSegmentFilter === segment.name
            return (
              <button
                key={segment.name}
                type="button"
                onClick={() => setActiveSegmentFilter(isActive ? null : segment.name)}
                className={cn(
                  "rounded-3xl border p-4 text-left text-sm shadow-sm transition",
                  "border-white/20 bg-white/70 hover:border-sky-400/40 hover:shadow-[0_18px_45px_-32px_rgba(14,165,233,0.55)] dark:border-slate-700/60 dark:bg-slate-900/70",
                  isActive ? "ring-1 ring-sky-400/50 dark:ring-sky-400/40" : ""
                )}
              >
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-slate-900 dark:text-white">{segment.name}</p>
                  <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                    {segment.count ?? 0}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {formatCurrency(segment.value)} managed volume
                </p>
                <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                  Click to {isActive ? "clear filter" : "filter roster"}
                </p>
              </button>
            )
          })}
        </CardContent>
      </Card>

      {creditHealth && (
        <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_70px_-38px_rgba(15,23,42,0.68)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
          <CardHeader className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Credit health snapshot</CardTitle>
              <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                Generated from utilisation and payment behaviour
              </CardDescription>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {creditHealth.factors?.map((factor) => (
              <div key={factor.factor} className="rounded-3xl border border-white/20 bg-white/70 p-4 text-sm shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                <p className="font-semibold text-slate-900 dark:text-white">{factor.factor}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Impact: {factor.impact}</p>
                <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{factor.score}%</p>
                <p className="text-xs text-emerald-500 dark:text-emerald-300">{factor.status}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      </div>

      {clientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur">
          <div className="w-full max-w-lg rounded-4xl border border-white/20 bg-white/95 p-6 shadow-2xl dark:border-slate-700/60 dark:bg-slate-900/90">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Add new client</h2>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  Capture relationship insights for manual additions
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setClientModalOpen(false); resetClientDraft() }}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <form className="mt-5 space-y-4" onSubmit={handleAddClient}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Name
                  <input
                    value={clientDraft.name}
                    onChange={(event) => handleClientDraftChange('name', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Client name"
                    required
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Email
                  <input
                    value={clientDraft.email}
                    onChange={(event) => handleClientDraftChange('email', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="client@company.com"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Segment
                  <input
                    value={clientDraft.segment}
                    onChange={(event) => handleClientDraftChange('segment', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Retail, SaaS, etc."
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Relationship owner
                  <input
                    value={user?.name || ''}
                    readOnly
                    className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Inflows (₹)
                  <input
                    value={clientDraft.inflow}
                    onChange={(event) => handleClientDraftChange('inflow', event.target.value)}
                    type="number"
                    min="0"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="500000"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Outflows (₹)
                  <input
                    value={clientDraft.outflow}
                    onChange={(event) => handleClientDraftChange('outflow', event.target.value)}
                    type="number"
                    min="0"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="320000"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Risk score
                  <input
                    value={clientDraft.riskScore}
                    onChange={(event) => handleClientDraftChange('riskScore', event.target.value)}
                    type="number"
                    min="0"
                    max="100"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="65"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Risk level
                  <select
                    value={clientDraft.risk}
                    onChange={(event) => handleClientDraftChange('risk', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </label>
              </div>
              {clientFormError && <p className="text-xs text-rose-500">{clientFormError}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => { setClientModalOpen(false); resetClientDraft() }}>
                  Cancel
                </Button>
                <Button type="submit">Save client</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default DashboardClients
