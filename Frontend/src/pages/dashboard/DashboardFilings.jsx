'use client'

import React, { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { ArrowRight, CalendarDays, Filter, Upload, X } from "lucide-react"

import { useTransactionsList } from "../../hooks/useDashboardApi"
import { useStatementUpload } from "../../hooks/useStatementUpload"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { cn } from "../../lib/utils"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form"
import { Input } from "../../components/ui/input"
import DateRangePicker from "../../components/ui/date-range-picker"
import FileUploader from "../../components/dashboard/FileUploader"
import NotificationCard from "../../components/ui/notification-card"

const formatCurrency = (value = 0) => `₹${Math.round(value).toLocaleString()}`
const normalise = (label = "") => label.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())

const COMPLIANCE_TEMPLATES = [
  { form: "GST-3B", window: "Monthly GST", bureau: "GSTN", dueDay: 24 },
  { form: "ITR-6", window: "Income tax", bureau: "Income Tax Dept", dueDay: 30 },
  { form: "TDS-24Q", window: "TDS", bureau: "TRACES", dueDay: 7 },
  { form: "ESI Return", window: "ESI", bureau: "ESIC", dueDay: 15 },
  { form: "PF Return", window: "Provident fund", bureau: "EPFO", dueDay: 25 },
  { form: "ITR-3", window: "Personal tax", bureau: "Income Tax Dept", dueDay: 31 },
]

export const DashboardFilings = () => {
  const form = useForm({
    defaultValues: {
      search: "",
      type: "",
      startDate: "",
      endDate: "",
    },
  })
  const [filters, setFilters] = useState({ limit: 12 })
  const { data: transactionsData, loading } = useTransactionsList(filters)
  const {
    handleUpload: uploadStatement,
    isUploading,
    uploadStatus,
    uploadError,
    notification,
    dismissNotification,
  } = useStatementUpload({
    onSuccess: () => setFilters((prev) => ({ ...prev })),
  })
  const fileInputRef = useRef(null)

  const filings = transactionsData?.transactions ?? []
  const categoryStats = transactionsData?.categoryStats ?? []
  const startDateValue = form.watch("startDate")
  const endDateValue = form.watch("endDate")

  const onSubmit = (values) => {
    const nextFilters = {
      limit: 12,
      search: values.search || undefined,
      type: values.type || undefined,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
    }
    setFilters(nextFilters)
  }

  const applyFilters = () => form.handleSubmit(onSubmit)()

  const handleUpload = async (files) => {
    if (!files?.length) return
    await uploadStatement(files[0]).catch(() => {})
  }

  const handleFilterButtonClick = () => {
    applyFilters()
  }

  const handleNewFilingClick = () => {
    fileInputRef.current?.click()
  }

  const handleNewFilingFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      event.target.value = ''
      return
    }
    try {
      await uploadStatement(file)
    } catch (error) {
      console.error('New filing upload failed', error)
    } finally {
      event.target.value = ''
    }
  }

  const scheduleStatusTone = {
    pending: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-200',
    prepping: 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-200',
    filed: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-200',
  }

  const openScheduleManager = (item) => {
    setActiveSchedule(item)
    setScheduleDraft({
      status: item.status,
      assignee: item.assignee === 'Unassigned' ? '' : item.assignee,
    })
  }

  const updateScheduleItem = (id, updates) => {
    setScheduleItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, ...updates } : item))
    )
  }

  const handleScheduleSave = (event) => {
    event?.preventDefault?.()
    if (!activeSchedule) return
    updateScheduleItem(activeSchedule.id, {
      status: scheduleDraft.status,
      assignee: scheduleDraft.assignee.trim() || 'Unassigned',
    })
    setActiveSchedule(null)
  }

  const closeScheduleManager = () => {
    setActiveSchedule(null)
    setScheduleDraft({ status: 'pending', assignee: '' })
  }

  const buildComplianceSchedule = () => {
    const now = new Date()
    return COMPLIANCE_TEMPLATES.map((template, index) => {
      let dueDate = new Date(now.getFullYear(), now.getMonth() + index, template.dueDay)
      if (dueDate < now) {
        dueDate = new Date(now.getFullYear(), now.getMonth() + index + 1, template.dueDay)
      }
      return {
        id: `${template.form}-${dueDate.getFullYear()}-${dueDate.getMonth() + 1}-${template.dueDay}`,
        ...template,
        dueDate,
        status: 'pending',
        assignee: 'Unassigned',
      }
    })
  }

  const [scheduleItems, setScheduleItems] = useState(() => buildComplianceSchedule())
  const [activeSchedule, setActiveSchedule] = useState(null)
  const [scheduleDraft, setScheduleDraft] = useState({ status: 'pending', assignee: '' })

  return (
    <>
      <div className="space-y-6">
        {notification && (
          <div className="pointer-events-none fixed inset-x-0 top-6 z-30 flex justify-center">
            <NotificationCard
              variant={notification.variant}
              title={notification.title}
              message={notification.message}
              onClose={dismissNotification}
              className="pointer-events-auto"
            />
          </div>
        )}

      <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_70px_-38px_rgba(15,23,42,0.68)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Filing pipeline</CardTitle>
            <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Filter filings and upload CSV statements
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFilterButtonClick}
              className="gap-2 border-white/30 bg-white/70 text-xs font-semibold uppercase tracking-[0.28em] transition-colors hover:border-sky-400/60 hover:text-sky-600 dark:border-slate-700/60 dark:bg-slate-900/70 dark:hover:border-sky-500/60 dark:hover:text-sky-200"
            >
              <Filter className="h-3.5 w-3.5" />
              Apply filters
            </Button>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleNewFilingClick}
                disabled={isUploading}
                className="gap-2 rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-4 text-xs font-semibold uppercase tracking-[0.28em] text-white shadow-[0_18px_45px_-28px_rgba(14,165,233,0.85)] disabled:opacity-70"
              >
                <Upload className="h-3.5 w-3.5" />
                {isUploading ? 'Uploading…' : 'New filing'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.pdf,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={handleNewFilingFileChange}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="search"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Search description</FormLabel>
                    <FormControl>
                      <Input placeholder="Client / narration" {...field} className="rounded-2xl" />
                    </FormControl>
                    <FormDescription>Matches description or narration.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <Input placeholder="credit / debit" {...field} className="rounded-2xl" />
                    </FormControl>
                    <FormDescription>Use credit for inflows, debit for outflows.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date range</FormLabel>
                    <FormControl>
                      <DateRangePicker
                        start={field.value}
                        end={endDateValue}
                        onChange={({ start, end }) => {
                          field.onChange(start)
                          form.setValue("endDate", end, { shouldDirty: true })
                        }}
                        placeholder="Filter by dates"
                      />
                    </FormControl>
                    <FormDescription>Select from and to dates to narrow filings.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-3 flex flex-wrap items-center justify-end gap-3 pt-1">
                <Button variant="ghost" type="button" onClick={() => { form.reset(); setFilters({ limit: 12 }) }}>
                  Clear
                </Button>
                <Button type="submit">Apply filters</Button>
              </div>
            </form>
          </Form>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,0.35fr)]">
            <div className="relative overflow-x-auto rounded-3xl border border-white/10 bg-white/70 shadow-[0_28px_70px_-44px_rgba(15,23,42,0.65)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
              {isUploading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/70 backdrop-blur dark:bg-slate-900/70">
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                    Processing with Gemini…
                  </div>
                </div>
              )}
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
                    <th className="px-5 pb-3">Date</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3 text-right pr-5">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
                  {loading && (
                    <tr>
                      <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400" colSpan={5}>
                        Loading filings…
                      </td>
                    </tr>
                  )}
                  {!loading && filings.length === 0 && (
                    <tr>
                      <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400" colSpan={5}>
                        No filings found for the selected filters.
                      </td>
                    </tr>
                  )}
                  {filings.map((filing) => (
                    <tr key={filing._id} className="text-sm">
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {new Date(filing.date).toLocaleDateString()}
                      </td>
                      <td className="py-4 text-slate-600 dark:text-slate-300">{filing.description}</td>
                      <td className="py-4 text-slate-600 dark:text-slate-300">{normalise(filing.category)}</td>
                      <td className="py-4 text-slate-600 dark:text-slate-300">{filing.type === "credit" ? "Inflow" : "Outflow"}</td>
                      <td className="py-4 text-right pr-5 text-slate-600 dark:text-slate-300">{formatCurrency(filing.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-white/15 bg-white/70 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">CSV ingestion</p>
                <FileUploader
                  accept=".csv,.pdf,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onSubmit={handleUpload}
                />
                {uploadStatus && <p className="mt-2 text-xs text-emerald-500">{uploadStatus}</p>}
                {uploadError && <p className="mt-2 text-xs text-rose-500">{uploadError}</p>}
              </div>
              <div className="rounded-3xl border border-white/15 bg-white/70 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Segments</p>
                <div className="mt-4 space-y-3">
                  {categoryStats.slice(0, 5).map((entry) => {
                    const inflow = Math.max(0, Math.round(entry.credit ?? entry.totalCredit ?? 0))
                    const outflow = Math.max(0, Math.round(entry.debit ?? entry.totalDebit ?? 0))
                    const hasBoth = inflow > 0 && outflow > 0
                    return (
                      <div key={entry._id} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-900 dark:text-white">{normalise(entry._id)}</span>
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          {inflow > 0 && <span className="text-emerald-500 dark:text-emerald-300">In {formatCurrency(inflow)}</span>}
                          {hasBoth && <span className="text-slate-400">·</span>}
                          {outflow > 0 && <span className="text-rose-500 dark:text-rose-300">Out {formatCurrency(outflow)}</span>}
                          {inflow === 0 && outflow === 0 && <span>{formatCurrency(0)}</span>}
                        </span>
                      </div>
                    )
                  })}
                  {categoryStats.length === 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">No category breakdown yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_70px_-38px_rgba(15,23,42,0.68)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Compliance schedule</CardTitle>
            <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Upcoming bureau deadlines
            </CardDescription>
          </div>
          <CalendarDays className="h-5 w-5 text-sky-500" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {scheduleItems.map((item) => {
            const dueLabel = item.dueDate instanceof Date
              ? item.dueDate.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
              : item.dueDate
            const statusLabel = item.status === 'filed'
              ? 'Filed'
              : item.status === 'prepping'
                ? 'In review'
                : 'Pending'
            return (
              <div key={item.id} className="rounded-3xl border border-white/20 bg-white/70 p-4 text-sm shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{item.form}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.window} · {item.bureau}</p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                    Due {dueLabel}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Prep window opens 48 hours prior. Ensure supporting ledgers are synced before submission.
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1', scheduleStatusTone[item.status] ?? scheduleStatusTone.pending)}>
                    {statusLabel}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    Owner: {item.assignee}
                  </span>
                </div>
                <Button
                  variant="link"
                  className="mt-3 gap-1 px-0 text-xs font-semibold uppercase tracking-[0.28em] text-sky-600 hover:text-sky-700 dark:text-sky-300"
                  onClick={() => openScheduleManager(item)}
                >
                  Manage
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
    {activeSchedule && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur">
        <div className="w-full max-w-md rounded-4xl border border-white/20 bg-white/95 p-6 shadow-2xl dark:border-slate-700/60 dark:bg-slate-900/90">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Manage {activeSchedule.form}</h2>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                Due {activeSchedule.dueDate.toLocaleDateString(undefined, { day: '2-digit', month: 'long' })}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={closeScheduleManager}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <form className="mt-5 space-y-4" onSubmit={handleScheduleSave}>
            <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
              Status
              <select
                value={scheduleDraft.status}
                onChange={(event) => setScheduleDraft((prev) => ({ ...prev, status: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="pending">Pending</option>
                <option value="prepping">In review</option>
                <option value="filed">Filed</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
              Assignee
              <input
                value={scheduleDraft.assignee}
                onChange={(event) => setScheduleDraft((prev) => ({ ...prev, assignee: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Assign reviewer"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={closeScheduleManager}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}

export default DashboardFilings
