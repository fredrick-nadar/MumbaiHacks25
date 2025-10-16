'use client'

import React, { useEffect, useMemo, useState } from "react"
import { format, parseISO, isBefore, startOfDay } from "date-fns"
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Handshake,
  Lightbulb,
  MessageSquare,
  PhoneCall,
  Settings,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserPlus,
  Video,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Label } from "../../components/ui/label"
import { DatePicker } from "../../components/ui/date-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { cn } from "../../lib/utils"
import { useAuth } from "../../contexts/AuthContext"
import { persistCaSessions, readStoredCaSessions } from "../../lib/caSessionStorage"

const advisors = [
  {
    id: "ananya",
    name: "CA Ananya Patel",
    speciality: "Direct tax strategy",
    experience: "11 years",
    languages: "English, Hindi",
    rating: "4.9",
  },
  {
    id: "rahul",
    name: "CA Rahul Desai",
    speciality: "GST & indirect tax",
    experience: "9 years",
    languages: "English, Gujarati",
    rating: "4.8",
  },
  {
    id: "meera",
    name: "CA Meera Krishnan",
    speciality: "Startup compliance & valuation",
    experience: "8 years",
    languages: "English, Tamil",
    rating: "4.9",
  },
]

const timeSlots = ["09:30", "10:30", "11:30", "14:30", "15:30", "17:00"]

const mediums = [
  {
    id: "video",
    label: "Video consultation",
    icon: Video,
    description: "Host a face-to-face session on an encrypted Meet link with shared whiteboards and document walkthroughs.",
  },
  {
    id: "phone",
    label: "Phone call",
    icon: PhoneCall,
    description: "Get a scheduled dial-in with recordings and call summaries mailed to your workspace inbox.",
  },
  {
    id: "in-person",
    label: "In-person",
    icon: Handshake,
    description: "Meet your CA at the BitNBuild lounge in Bengaluru with concierge support and compliance concierge checks.",
  },
]

const focusAreas = [
  {
    value: "Tax planning",
    label: "Tax planning",
    description: "Structure advance tax, deductions, and quarterly estimates with clarity.",
    icon: BarChart3,
  },
  {
    value: "Compliance automation",
    label: "Compliance automation",
    description: "Wire workflows to Acternity automations and trim manual reviews.",
    icon: Settings,
  },
  {
    value: "Client onboarding",
    label: "Client onboarding",
    description: "Standardise KYC, proposals, and onboarding journeys for new mandates.",
    icon: UserPlus,
  },
  {
    value: "Credit health advisory",
    label: "Credit health advisory",
    description: "Decode CIBIL movements, bureau alerts, and lending readiness.",
    icon: ShieldCheck,
  },
  {
    value: "Firm operations",
    label: "Firm operations",
    description: "Scale partner capacity, staffing, and pricing playbooks.",
    icon: Lightbulb,
  },
]

const preparationSteps = [
  {
    title: "Share working papers",
    description: "Upload supporting ledgers and reconciliations 24 hours before the call so your CA can pre-review.",
    icon: UploadCloud,
  },
  {
    title: "Confirm discussion points",
    description: "We sanity-check your agenda and send back a checklist so nothing is missed.",
    icon: MessageSquare,
  },
  {
    title: "Capture next actions",
    description: "Post-session, you receive annotated runbooks and filing-ready templates in your mailbox.",
    icon: CheckCircle2,
  },
]

const DashboardCaSession = () => {
  const { user } = useAuth()
  const [booking, setBooking] = useState({
    advisorId: advisors[0].id,
    focusDate: "",
    timeSlot: "",
    medium: "video",
    agenda: "",
    focusAreas: new Set(),
  })
  const [status, setStatus] = useState("idle")
  const [formError, setFormError] = useState(null)
  const [bookedSessions, setBookedSessions] = useState(() => readStoredCaSessions())

  useEffect(() => {
    persistCaSessions(bookedSessions)
  }, [bookedSessions])

  const selectedAdvisor = useMemo(
    () => advisors.find((advisor) => advisor.id === booking.advisorId) ?? advisors[0],
    [booking.advisorId]
  )

  const selectedTopics = useMemo(() => Array.from(booking.focusAreas), [booking.focusAreas])
  const selectedFocusMeta = useMemo(
    () => focusAreas.filter((option) => booking.focusAreas.has(option.value)),
    [booking.focusAreas]
  )
  const mediumDetails = useMemo(
    () => mediums.find((item) => item.id === booking.medium) ?? mediums[0],
    [booking.medium]
  )
  const orderedSessions = useMemo(() => {
    return [...bookedSessions].sort((a, b) => {
      const first = parseISO(a.focusDate ?? "")
      const second = parseISO(b.focusDate ?? "")
      return (second.getTime() || 0) - (first.getTime() || 0)
    })
  }, [bookedSessions])

  const stageChips = [
    { label: "Advisor", complete: Boolean(booking.advisorId) },
    { label: "Slot", complete: Boolean(booking.focusDate && booking.timeSlot) },
    { label: "Agenda", complete: Boolean(booking.focusAreas.size || booking.agenda) },
  ]

  const handleFieldChange = (field, value) => {
    setFormError(null)
    setBooking((prev) => ({ ...prev, [field]: value }))
  }

  const handleToggleFocus = (value) => {
    setFormError(null)
    setBooking((prev) => {
      const next = new Set(prev.focusAreas)
      if (next.has(value)) {
        next.delete(value)
      } else {
        next.add(value)
      }
      return { ...prev, focusAreas: next }
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (status === "saving") return
    setFormError(null)

    if (!booking.focusDate) {
      setFormError("Select a preferred session date.")
      return
    }

    const sessionDate = parseISO(booking.focusDate)
    if (Number.isNaN(sessionDate?.getTime?.())) {
      setFormError("Pick a valid calendar date.")
      return
    }

    const todayStart = startOfDay(new Date())
    if (isBefore(sessionDate, todayStart)) {
      setFormError("Pick a date from today onwards.")
      return
    }

    if (!booking.timeSlot) {
      setFormError("Select a convenient time slot.")
      return
    }

    if (!booking.focusAreas.size && !booking.agenda.trim()) {
      setFormError("Add focus areas or share context so your CA can prepare.")
      return
    }

    const hasSessionThisMonth = bookedSessions.some((session) => {
      const existing = parseISO(session.focusDate ?? "")
      return (
        !Number.isNaN(existing?.getTime?.()) &&
        existing.getFullYear() === sessionDate.getFullYear() &&
        existing.getMonth() === sessionDate.getMonth()
      )
    })

    if (hasSessionThisMonth) {
      setFormError("Only one personal CA session per calendar month is allowed. Pick another month.")
      return
    }

    setStatus("saving")
    setTimeout(() => {
      const newSession = {
        id: `${Date.now()}`,
        advisorId: booking.advisorId,
        advisorName: selectedAdvisor.name,
        focusDate: booking.focusDate,
        timeSlot: booking.timeSlot,
        medium: booking.medium,
        agenda: booking.agenda,
        focusAreas: Array.from(booking.focusAreas),
        createdAt: new Date().toISOString(),
      }
      setBookedSessions((prev) => [newSession, ...prev])
      setStatus("scheduled")
      setBooking((prev) => ({
        ...prev,
        focusDate: "",
        timeSlot: "",
        agenda: "",
        focusAreas: new Set(),
      }))
      setTimeout(() => setStatus("idle"), 3000)
    }, 800)
  }

  const focusSummary = selectedFocusMeta.map((item) => item.label)
  const today = new Date()

  return (
    <div className="space-y-6">
      <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_70px_-38px_rgba(15,23,42,0.68)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-white">
              <Sparkles className="h-5 w-5 text-sky-500" />
              Schedule a personal CA session
            </CardTitle>
            <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              One Acternity concierge slot per calendar month
            </CardDescription>
          </div>
          <div className="rounded-full border border-white/30 bg-white/70 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300">
            <Calendar className="mr-2 inline h-3 w-3" />
            Slots open this week
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <form onSubmit={handleSubmit} className="grid gap-5">
            <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-white/20 bg-white/75 px-4 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300">
              {stageChips.map((stage, index) => (
                <span
                  key={stage.label}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 transition",
                    stage.complete
                      ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-600 dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-200"
                      : "border-white/30 bg-white/60 text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-400"
                  )}
                >
                  {stage.complete ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {index + 1}
                    </span>
                  )}
                  {stage.label}
                </span>
              ))}
            </div>

            <section className="space-y-3 rounded-3xl border border-white/20 bg-white/80 p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                Choose advisor
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                {advisors.map((advisor) => {
                  const isActive = booking.advisorId === advisor.id
                  return (
                    <button
                      key={advisor.id}
                      type="button"
                      onClick={() => handleFieldChange("advisorId", advisor.id)}
                      className={cn(
                        "flex h-full flex-col rounded-3xl border px-4 py-4 text-left transition",
                        isActive
                          ? "border-sky-400/70 bg-gradient-to-br from-sky-500/80 via-cyan-400/80 to-emerald-400/70 text-white shadow-lg"
                          : "border-slate-200/70 bg-white/90 text-slate-700 hover:border-sky-300/60 hover:shadow-lg dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300"
                      )}
                    >
                      <div className="flex items-center justify-between text-xs opacity-80">
                        <span>{advisor.experience}</span>
                        <span>★ {advisor.rating}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-inherit">{advisor.name}</p>
                      <p className="mt-1 text-xs opacity-80">{advisor.speciality}</p>
                      <p className="mt-3 text-[11px] opacity-70">{advisor.languages}</p>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="grid gap-4 rounded-3xl border border-white/20 bg-white/80 p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                Pick slot
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Preferred date</Label>
                  <DatePicker
                    value={booking.focusDate}
                    onChange={(value) => handleFieldChange("focusDate", value)}
                    placeholder="Select consultation date"
                    minDate={today}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeSlot">Timeslot</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => handleFieldChange("timeSlot", slot)}
                        className={cn(
                          "rounded-2xl border px-3 py-2 text-sm font-semibold transition",
                          booking.timeSlot === slot
                            ? "border-sky-400/70 bg-sky-500/10 text-sky-600"
                            : "border-white/30 bg-white/70 text-slate-600 hover:border-sky-400/50 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300"
                        )}
                      >
                        <Clock className="mr-1 inline h-3.5 w-3.5" />
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Consultation medium</Label>
                <Tabs value={booking.medium} onValueChange={(value) => handleFieldChange("medium", value)} className="w-full">
                  <TabsList className="flex w-full flex-wrap gap-2 rounded-full border border-white/30 bg-white/70 p-1 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                    {mediums.map(({ id, label, icon }) => (
                      <TabsTrigger
                        key={id}
                        value={id}
                        className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-600 dark:text-slate-300 dark:data-[state=active]:bg-emerald-500/20 dark:data-[state=active]:text-emerald-200"
                      >
                        {React.createElement(icon, { className: "h-4 w-4" })}
                        {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {mediums.map(({ id, description }) => (
                    <TabsContent
                      key={id}
                      value={id}
                      className="mt-3 rounded-2xl border border-white/30 bg-white/80 p-4 text-xs leading-relaxed text-slate-600 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300"
                    >
                      {description}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </section>

            <section className="grid gap-4 rounded-3xl border border-white/20 bg-white/80 p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                Agenda
              </p>
              <div className="space-y-3">
                <Label>Focus areas</Label>
                <div className="grid gap-3">
                  {focusAreas.map(({ value, label, description, icon }) => {
                    const isActive = booking.focusAreas.has(value)
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleToggleFocus(value)}
                        className={cn(
                          "group flex items-start gap-3 rounded-3xl border px-4 py-3 text-left transition",
                          isActive
                            ? "border-sky-400/70 bg-sky-500/10 text-sky-700 shadow-lg dark:border-sky-500/60 dark:bg-sky-500/10 dark:text-sky-200"
                            : "border-white/30 bg-white/70 text-slate-600 hover:border-sky-400/50 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-2xl border text-slate-500 transition group-hover:scale-105",
                            isActive
                              ? "border-sky-400/60 bg-white/95 text-sky-600 dark:border-sky-500/60 dark:bg-slate-900/40 dark:text-sky-200"
                              : "border-white/40 bg-white/80 dark:border-slate-700/60 dark:bg-slate-900/60"
                          )}
                        >
                          {React.createElement(icon, { className: "h-4 w-4" })}
                        </span>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">{label}</p>
                          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div
                  className={cn(
                    "flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs leading-relaxed shadow-sm",
                    selectedTopics.length
                      ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                      : "border-sky-400/40 bg-sky-500/10 text-sky-600 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200"
                  )}
                >
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5" />
                  <span>
                    {selectedTopics.length
                      ? `Brief locked on ${focusSummary.join(', ')}`
                      : 'Select up to three focus areas so your Acternity CA preps the right data room.'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="agenda">Share context</Label>
                <textarea
                  id="agenda"
                  value={booking.agenda}
                  onChange={(event) => handleFieldChange("agenda", event.target.value)}
                  rows={4}
                  placeholder="Tell your CA what you need help with"
                  className="w-full rounded-2xl border border-white/30 bg-white/70 p-3 text-sm shadow-sm focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-200/60 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200"
                />
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <p>We send calendar invites and dial-in details once confirmed.</p>
                {status === "scheduled" && (
                  <p className="font-semibold text-emerald-600 dark:text-emerald-300">
                    Session booked! Check your inbox for confirmation.
                  </p>
                )}
                {formError && (
                  <p className="font-semibold text-rose-500 dark:text-rose-400">{formError}</p>
                )}
                {!formError && status !== "scheduled" && (
                  <p className="text-[11px] opacity-70">One session per calendar month. Need another? Talk to your success partner.</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={status === "saving"}
                className="rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-6 text-sm font-semibold text-white shadow-[0_20px_45px_-28px_rgba(14,165,233,0.85)] disabled:opacity-75"
              >
                {status === "saving" ? "Scheduling…" : "Confirm session"}
              </Button>
            </div>
          </form>

          <div className="min-w-0 space-y-5">
            <Card className="h-full rounded-3xl border-white/20 bg-white/80 shadow-[0_20px_55px_-30px_rgba(15,23,42,0.6)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Session preview</CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  We prep your Acternity CA with this snapshot before meeting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                <div className="rounded-2xl border border-white/30 bg-white/90 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Advisor</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{selectedAdvisor.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedAdvisor.speciality}</p>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Languages: {selectedAdvisor.languages}</p>
                </div>
                <div className="grid gap-3 rounded-2xl border border-white/30 bg-white/90 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Schedule</p>
                  <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <Calendar className="h-4 w-4" />
                    {booking.focusDate ? format(parseISO(booking.focusDate), "dd MMM yyyy") : "Pick a date"}
                    <Clock className="h-4 w-4" />
                    {booking.timeSlot || "Select time"}
                  </div>
                  {mediumDetails && (
                    <div className="flex items-start gap-2 rounded-2xl border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-600 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200">
                      {React.createElement(mediumDetails.icon, { className: "mt-0.5 h-3.5 w-3.5" })}
                      <span>{mediumDetails.description}</span>
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-white/30 bg-white/90 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Agenda</p>
                  {selectedFocusMeta.length ? (
                    <ul className="mt-3 space-y-2 text-xs">
                      {selectedFocusMeta.map(({ value, label, description, icon }) => (
                        <li
                          key={value}
                          className="flex items-start gap-3 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                        >
                          {React.createElement(icon, { className: "mt-0.5 h-3.5 w-3.5" })}
                          <div>
                            <p className="font-semibold">{label}</p>
                            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-200/90">{description}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">Select focus areas to help your advisor prepare.</p>
                  )}
                  {booking.agenda && (
                    <p className="mt-3 rounded-2xl border border-slate-200/60 bg-slate-50/60 px-3 py-2 text-xs leading-relaxed text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300">
                      {booking.agenda}
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-white/30 bg-white/90 p-4 text-xs shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-400">
                  <p className="font-semibold text-slate-600 dark:text-slate-200">Attendees</p>
                  <p className="mt-2 text-slate-500 dark:text-slate-400">{user?.name || "You"}</p>
                  <p className="text-slate-400">{user?.email || "workspace@taxwise.in"}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-white/20 bg-white/80 shadow-[0_20px_55px_-32px_rgba(15,23,42,0.55)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Concierge prep timeline</CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  What happens between now and your session.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                {preparationSteps.map(({ title, description, icon }, index) => (
                  <div
                    key={title}
                    className="flex items-start gap-3 rounded-2xl border border-white/25 bg-white/90 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-sky-400/40 bg-sky-500/10 text-sky-600 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200">
                      {React.createElement(icon, { className: "h-4 w-4" })}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {index + 1}. {title}
                      </p>
                      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-3xl border-white/20 bg-white/80 shadow-[0_20px_55px_-32px_rgba(59,130,246,0.45)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Scheduled sessions</CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Track your 1:1 bookings – one slot per calendar month.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                {orderedSessions.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-slate-300/60 bg-white/70 p-4 text-center text-xs text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-400">
                    No sessions booked yet. Schedule your first personal CA consult.
                  </div>
                )}
                {orderedSessions.slice(0, 4).map((session) => {
                  const sessionDate = parseISO(session.focusDate ?? "")
                  const formattedDate = Number.isNaN(sessionDate?.getTime?.())
                    ? session.focusDate
                    : format(sessionDate, "dd MMM yyyy")
                  const sessionMedium = mediums.find((item) => item.id === session.medium)?.label ?? session.medium
                  const focus = Array.isArray(session.focusAreas) && session.focusAreas.length
                    ? session.focusAreas.slice(0, 3).join(", ")
                    : null
                  return (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-white/25 bg-white/90 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        <span className="inline-flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formattedDate}
                          <Clock className="h-4 w-4" />
                          {session.timeSlot}
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">{sessionMedium}</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Advisor {session.advisorName}</p>
                      {focus && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">Focus: {focus}</p>
                      )}
                    </div>
                  )
                })}
                {orderedSessions.length > 4 && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    +{orderedSessions.length - 4} earlier sessions archived.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardCaSession
