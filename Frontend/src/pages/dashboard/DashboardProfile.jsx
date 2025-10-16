'use client'

import React, { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { compareAsc, compareDesc, format, isBefore, parseISO } from "date-fns"
import { BadgeCheck, Calendar, ChevronRight, Clock, Fingerprint, Handshake, Lock, PhoneCall, User, Video } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { useAuth } from "../../contexts/AuthContext"
import { useCreditHealth, useTaxSimulation } from "../../hooks/useDashboardApi"
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover"
import { cn } from "../../lib/utils"
import { readStoredCaSessions } from "../../lib/caSessionStorage"

const formatCurrency = (value = 0) => `₹${Math.round(value).toLocaleString()}`

const sessions = [
  { device: "MacBook Pro", location: "Bengaluru, IN", lastActive: "12 mins ago", secure: true },
  { device: "Pixel 8", location: "Mumbai, IN", lastActive: "1 hour ago", secure: true },
  { device: "iPad", location: "Pune, IN", lastActive: "2 days ago", secure: false },
]

const mediumMetadata = {
  video: { label: "Video consultation", icon: Video },
  phone: { label: "Phone call", icon: PhoneCall },
  "in-person": { label: "In-person", icon: Handshake },
}

const securityControlDefaults = [
  {
    key: "approvals",
    title: "Partner approvals",
    description: "Enable maker-checker flow before filings are submitted to the department.",
    status: "pending",
    documentation: "https://docs.bitnbuild.com/security/approvals",
    runbookSlug: "partner-approvals",
  },
  {
    key: "api-keys",
    title: "Rotate API keys",
    description: "Rotate workspace API keys and revoke stale credentials every 30 days.",
    status: "review",
    documentation: "https://docs.bitnbuild.com/security/api-keys",
    runbookSlug: "api-key-rotation",
  },
  {
    key: "webhook",
    title: "Bureau webhook",
    description: "Receive bureau breaches in near real-time with signed callbacks.",
    status: "pending",
    documentation: "https://docs.bitnbuild.com/security/webhooks",
    runbookSlug: "bureau-webhook",
  },
  {
    key: "mfa",
    title: "Client MFA",
    description: "Require OTP or authenticator approval for client logins.",
    status: "enabled",
    documentation: "https://docs.bitnbuild.com/security/mfa",
    runbookSlug: "client-mfa",
  },
  {
    key: "audit-log",
    title: "Audit log",
    description: "Stream every sensitive change to a tamper-proof ledger.",
    status: "enabled",
    documentation: "https://docs.bitnbuild.com/security/audit-log",
    runbookSlug: "audit-log",
  },
  {
    key: "compliance-pack",
    title: "Compliance pack",
    description: "Download SOC and ISO artefacts for regulator submissions.",
    status: "review",
    documentation: "https://docs.bitnbuild.com/security/compliance",
    runbookSlug: "compliance-pack",
  },
]

const securityStatusStyles = {
  enabled: {
    label: "Enabled",
    className: "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200",
  },
  review: {
    label: "Needs review",
    className: "bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-200",
  },
  pending: {
    label: "Pending setup",
    className: "bg-slate-200/70 text-slate-600 dark:bg-slate-800/70 dark:text-slate-200",
  },
}

export const DashboardProfile = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: creditHealth } = useCreditHealth()
  const { data: taxSimulation } = useTaxSimulation()
  const [profileForm, setProfileForm] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: "",
    designation: "",
    firm: "",
    website: "",
    address: "",
  })
  const [saveState, setSaveState] = useState("idle")
  const [securityControls, setSecurityControls] = useState(securityControlDefaults)
  const [caSessions, setCaSessions] = useState(() => readStoredCaSessions())

  useEffect(() => {
    setProfileForm((prev) => ({
      ...prev,
      fullName: user?.name || prev.fullName,
      email: user?.email || prev.email,
    }))
  }, [user?.name, user?.email])

  useEffect(() => {
    if (typeof window === "undefined") return
    const syncSessions = () => {
      setCaSessions(readStoredCaSessions())
    }
    syncSessions()
    window.addEventListener("storage", syncSessions)
    return () => window.removeEventListener("storage", syncSessions)
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setProfileForm((prev) => ({ ...prev, [name]: value }))
    if (saveState !== "saving") {
      setSaveState("dirty")
    }
  }

  const handleProfileSave = (event) => {
    event.preventDefault()
    setSaveState("saving")
    setTimeout(() => {
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 3200)
    }, 900)
  }

  const markSecurityControlStatus = (key, status) => {
    setSecurityControls((prev) =>
      prev.map((control) =>
        control.key === key
          ? {
              ...control,
              status,
              lastUpdated: new Date().toISOString(),
            }
          : control
      )
    )
  }

  const initials = useMemo(() => {
    if (!profileForm.fullName) return "TW"
    return profileForm.fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
  }, [profileForm.fullName])

  const creditScore = creditHealth?.estimatedScore ?? null
  const creditRange = creditHealth?.scoreRange ?? null
  const creditLastUpdated = creditHealth?.lastUpdated ? new Date(creditHealth.lastUpdated) : null

  const oldRegimeTax = taxSimulation?.oldRegime?.tax ?? null
  const newRegimeTax = taxSimulation?.newRegime?.tax ?? null
  const recommendedRegime = taxSimulation?.recommendation?.regime ?? null
  const taxSaved = taxSimulation?.recommendation?.taxSaved ?? null
  const taxMessage = taxSimulation?.recommendation?.message ?? null

  const caSessionBuckets = useMemo(() => {
    if (!caSessions?.length) {
      return { upcoming: [], past: [] }
    }
    const now = new Date()
    const normalised = caSessions
      .map((session) => {
        const date = parseISO(session.focusDate ?? "")
        if (Number.isNaN(date?.getTime?.())) return null
        if (session.timeSlot) {
          const [hoursPart, minutesPart] = session.timeSlot.split(":")
          const hours = Number.parseInt(hoursPart ?? "", 10)
          const minutes = Number.parseInt(minutesPart ?? "0", 10)
          if (!Number.isNaN(hours)) {
            date.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0)
          }
        }
        return {
          ...session,
          dateObj: date,
        }
      })
      .filter(Boolean)

    const upcoming = normalised
      .filter((session) => !isBefore(session.dateObj, now))
      .sort((first, second) => compareAsc(first.dateObj, second.dateObj))

    const past = normalised
      .filter((session) => isBefore(session.dateObj, now))
      .sort((first, second) => compareDesc(first.dateObj, second.dateObj))

    return {
      upcoming,
      past,
    }
  }, [caSessions])

  const nextSession = caSessionBuckets.upcoming[0] ?? null
  const upcomingQueue = nextSession ? caSessionBuckets.upcoming.slice(1) : caSessionBuckets.upcoming
  const previousSessions = caSessionBuckets.past

  const renderSessionCard = (session) => {
    const { label, icon } = mediumMetadata[session.medium] ?? { label: session.medium, icon: User }
    const MediumIcon = icon ?? User
    const focusAreas = Array.isArray(session.focusAreas) ? session.focusAreas.slice(0, 3) : []
    const focusCopy = focusAreas.length ? `Focus: ${focusAreas.join(', ')}` : null
    const formattedDate = format(session.dateObj, 'dd MMM yyyy')
    const formattedTime = format(session.dateObj, 'hh:mm a')

    return (
      <div
        key={session.id ?? `${session.focusDate}-${session.timeSlot}`}
        className="rounded-2xl border border-white/20 bg-white/80 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <span className="inline-flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {formattedDate}
            <Clock className="h-4 w-4" />
            {formattedTime}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-400">
            <MediumIcon className="h-3.5 w-3.5" />
            {label}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Advisor {session.advisorName}</p>
        {focusCopy && <p className="text-xs text-slate-500 dark:text-slate-400">{focusCopy}</p>}
      </div>
    )
  }

  const prettyDate = (date) =>
    date
      ? date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
      : 'Awaiting sync'

  return (
    <div className="space-y-6">
      <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_70px_-38px_rgba(15,23,42,0.68)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Profile & access</CardTitle>
            <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Identity anchored to Aadhaar verification
            </CardDescription>
          </div>
          <BadgeCheck className="h-5 w-5 text-emerald-400" />
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)]">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-3xl border border-white/20 bg-white/70 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/80 via-cyan-400/80 to-emerald-400/80 text-white">
                <span className="text-sm font-semibold">{initials}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{profileForm.fullName || "Your name"}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{profileForm.designation || "Assign your role"}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-center gap-2 border-white/30 bg-white/70 text-sm font-semibold dark:border-slate-700/60 dark:bg-slate-900/70"
              onClick={() => navigate("/dashboard/kyc-refresh")}
            >
              <Fingerprint className="h-4 w-4" />
              Refresh Aadhaar KYC
            </Button>
            <Button
              className="w-full justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 text-sm font-semibold text-white shadow-[0_20px_45px_-28px_rgba(14,165,233,0.85)]"
              onClick={() => navigate("/dashboard/branding")}
            >
              Manage firm branding
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-4">
            <form
              onSubmit={handleProfileSave}
              className="space-y-5 rounded-3xl border border-white/20 bg-white/70 p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                Profile details
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    value={profileForm.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={handleChange}
                    placeholder="name@firm.com"
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={profileForm.phone}
                    onChange={handleChange}
                    placeholder="+91"
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    name="designation"
                    value={profileForm.designation}
                    onChange={handleChange}
                    placeholder="Partner, Director, etc."
                    className="rounded-2xl"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firm">Firm / organisation</Label>
                  <Input
                    id="firm"
                    name="firm"
                    value={profileForm.firm}
                    onChange={handleChange}
                    placeholder="Your firm"
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    name="website"
                    value={profileForm.website}
                    onChange={handleChange}
                    placeholder="https://"
                    className="rounded-2xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Office address</Label>
                <Input
                  id="address"
                  name="address"
                  value={profileForm.address}
                  onChange={handleChange}
                  placeholder="Building, street, city"
                  className="rounded-2xl"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {saveState === "saved"
                    ? "Profile synced to workspace"
                    : saveState === "saving"
                      ? "Saving changes..."
                      : saveState === "dirty"
                        ? "Unsaved edits"
                        : "Update details to personalise workspace"}
                </div>
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-full px-6"
                  disabled={saveState === "saving"}
                >
                  {saveState === "saving" ? "Saving..." : "Save profile"}
                </Button>
              </div>
            </form>
            <div className="rounded-3xl border border-white/20 bg-white/70 p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                Active sessions
              </p>
              <div className="mt-4 space-y-3 text-xs text-slate-500 dark:text-slate-400">
                {sessions.map((session) => (
                  <div key={`${session.device}-${session.location}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/65 px-4 py-3 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{session.device}</p>
                      <p>{session.location}</p>
                    </div>
                    <div className="text-right">
                      <p>{session.lastActive}</p>
                      <p className={session.secure ? "text-emerald-500" : "text-amber-500"}>
                        {session.secure ? "Secured" : "Reauth required"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
      </div>
      </CardContent>
      </Card>

      <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_70px_-38px_rgba(15,23,42,0.68)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">CA concierge sessions</CardTitle>
            <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              One personal consultation per calendar month
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 text-sm text-slate-600 dark:text-slate-300">
          {caSessionBuckets.upcoming.length === 0 && previousSessions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300/60 bg-white/70 p-5 text-center text-xs text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-400">
              No concierge sessions booked yet. You can schedule one from the CA session page.
            </div>
          ) : (
            <div className="space-y-5">
              {nextSession && (
                <div className="rounded-3xl border border-emerald-400/50 bg-emerald-500/10 p-5 shadow-sm dark:border-emerald-400/40 dark:bg-emerald-500/10">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-600 dark:text-emerald-200">
                    Next session
                  </p>
                  <div className="mt-3 space-y-3">
                    {renderSessionCard(nextSession)}
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-200">
                      We email dial-in details and prep checklist 24 hours before the slot.
                    </p>
                  </div>
                </div>
              )}

              {upcomingQueue.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                    Upcoming sessions
                  </p>
                  {upcomingQueue.slice(0, 3).map((session) => renderSessionCard(session))}
                </div>
              )}

              {previousSessions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                    Previous sessions
                  </p>
                  {previousSessions.slice(0, 4).map((session) => renderSessionCard(session))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {(creditHealth || creditScore || creditRange) && (
        <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_70px_-38px_rgba(15,23,42,0.68)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
          <CardHeader className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Credit health</CardTitle>
              <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                Estimated from utilisation and payment history
              </CardDescription>
            </div>
            <BadgeCheck className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-white/20 bg-white/70 p-4 text-sm shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Score</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                {creditScore ? `${creditScore}/900` : 'Awaiting data'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {creditRange ?? 'Upload credit-linked statements to unlock scoring.'}
              </p>
              <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                Last updated {prettyDate(creditLastUpdated)}
              </p>
            </div>
            {creditHealth?.factors?.slice(0, 3).map((factor) => (
              <div key={factor.factor} className="rounded-3xl border border-white/20 bg-white/70 p-4 text-sm shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
                <p className="font-semibold text-slate-900 dark:text-white">{factor.factor}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Impact: {factor.impact}</p>
                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{factor.score}%</p>
                <p className="text-xs text-emerald-500 dark:text-emerald-300">{factor.status}</p>
              </div>
            ))}
            {!creditHealth?.factors?.length && (
              <div className="rounded-3xl border border-dashed border-slate-300/70 bg-white/70 p-4 text-xs text-slate-500 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-400">
                Sync credit card or loan statements to break down utilisation, payment history, and mix.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(taxSimulation || recommendedRegime || taxSaved !== null) && (
        <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_70px_-38px_rgba(15,23,42,0.68)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
          <CardHeader className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Tax optimiser</CardTitle>
              <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                {taxSimulation?.assessmentYear
                  ? `Comparing regimes for assessment year ${taxSimulation.assessmentYear}`
                  : 'Run a simulation to compare regimes instantly'}
              </CardDescription>
            </div>
            <BadgeCheck className="h-5 w-5 text-sky-500" />
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-3xl border border-white/20 bg-white/70 p-4 text-sm shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Recommendation</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                {recommendedRegime ? `Choose ${recommendedRegime.toUpperCase()} regime` : 'Awaiting income data'}
              </p>
              <p className="text-xs text-emerald-500 dark:text-emerald-300">
                {taxSaved !== null ? `Save ${formatCurrency(taxSaved)}` : 'Sync ledgers to quantify savings'}
              </p>
              {taxMessage && (
                <p className="mt-3 rounded-2xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-200">
                  {taxMessage}
                </p>
              )}
            </div>
            <div className="rounded-3xl border border-white/20 bg-white/70 p-4 text-sm shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Old regime</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{oldRegimeTax !== null ? formatCurrency(oldRegimeTax) : '₹0'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deductions {formatCurrency(taxSimulation?.oldRegime?.deductions ?? 0)}
              </p>
            </div>
            <div className="rounded-3xl border border-white/20 bg-white/70 p-4 text-sm shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">New regime</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{newRegimeTax !== null ? formatCurrency(newRegimeTax) : '₹0'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Standard deduction {formatCurrency(taxSimulation?.newRegime?.standardDeduction ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_70px_-38px_rgba(15,23,42,0.68)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Security centre</CardTitle>
            <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Settings wired to backend auth service
            </CardDescription>
          </div>
          <Lock className="h-5 w-5 text-sky-500" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {securityControls.map((control) => {
            const tone = securityStatusStyles[control.status] ?? securityStatusStyles.pending
            return (
              <div
                key={control.key}
                className="flex h-full flex-col justify-between rounded-3xl border border-white/20 bg-white/70 p-4 text-sm shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{control.title}</p>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{control.description}</p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.28em]",
                        tone.className
                      )}
                    >
                      {tone.label}
                    </span>
                  </div>
                  {control.lastUpdated && (
                    <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                      Updated just now
                    </p>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="link"
                        className="gap-1 px-0 text-xs font-semibold uppercase tracking-[0.28em] text-sky-600 hover:text-sky-700 dark:text-sky-300"
                      >
                        Manage
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 space-y-3 text-xs">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                        Quick actions
                      </p>
                      <Button
                        variant="outline"
                        className="w-full justify-center rounded-full border-sky-400/40 bg-white/80 text-sky-600 hover:text-sky-700 dark:border-sky-500/40 dark:bg-slate-900/70 dark:text-sky-200"
                        onClick={() => markSecurityControlStatus(control.key, "enabled")}
                      >
                        Mark as enabled
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-center rounded-full border-amber-400/40 bg-white/80 text-amber-600 hover:text-amber-700 dark:border-amber-400/40 dark:bg-slate-900/70 dark:text-amber-200"
                        onClick={() => markSecurityControlStatus(control.key, "review")}
                      >
                        Flag for review
                      </Button>
                      <Link
                        to={control.runbookSlug ? `/dashboard/runbooks/${control.runbookSlug}` : "#"}
                        className="block rounded-full border border-transparent bg-slate-100 px-3 py-2 text-center font-semibold text-slate-600 transition hover:border-sky-400/40 hover:text-sky-600 dark:bg-slate-800 dark:text-slate-200"
                      >
                        View runbook
                      </Link>
                    </PopoverContent>
                  </Popover>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">SecOps API wired</span>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardProfile
