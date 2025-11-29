import React, { useEffect, useMemo, useRef, useState } from "react"
import { motion as Motion } from "framer-motion"
import { Link, Navigate, Route, Routes, useNavigate, useSearchParams } from "react-router-dom"

import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  Layers3,
  Fingerprint,
  GaugeCircle,
  ShieldCheck,
  Sparkle,
  Upload,
} from "lucide-react"
import { Button } from "./components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { Input } from "./components/ui/input"
import { Label } from "./components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs"
import AadhaarAuthPage from "./components/auth/AadhaarAuthPage"
import DigiLockerAuthPage from "./pages/public/DigiLockerAuthPage"
import LogoBadge from "./components/logo"
import NotificationCard from "./components/ui/notification-card"

import { cn } from "./lib/utils"
import { useAuth } from "./contexts/AuthContext"
import { useStatementUpload } from "./hooks/useStatementUpload"
import DashboardLayout from "./pages/dashboard/DashboardLayout"
import DashboardOverview from "./pages/dashboard/DashboardOverview"
import DashboardAnalytics from "./pages/dashboard/DashboardAnalytics"
import DashboardPredictions from "./pages/dashboard/DashboardPredictions"
import DashboardFilings from "./pages/dashboard/DashboardFilings"
import DashboardVoiceInput from "./pages/dashboard/DashboardVoiceInput"
import DashboardProfile from "./pages/dashboard/DashboardProfile"
import DashboardBranding from "./pages/dashboard/DashboardBranding"
import DashboardKycRefresh from "./pages/dashboard/DashboardKycRefresh"
import BlockchainInsurance from "./pages/dashboard/BlockchainInsurance"
import DashboardRunbook from "./pages/dashboard/DashboardRunbook"
import { BrandingProvider, useBranding } from "./contexts/BrandingContext"
import TaxCalculatorPage from "./pages/public/TaxCalculatorPage"

const heroStats = [
  {
    label: "Financial Data Ingestion",
    description: "Upload bank, credit card & ERP statements in seconds.",
    icon: FileSpreadsheet,
  },
  {
    label: "AI Optimization Engine",
    description: "Pinpoint deductible opportunities with autonomous reviews.",
    icon: GaugeCircle,
  },
  {
    label: "CIBIL Score Advisor",
    description: "Forecast credit impact before filing to protect your clients.",
    icon: ShieldCheck,
  },
]

const livePreviewSteps = [
  "Upload statements",
  "Smart categorisation",
  "Review calculations",
  "File your taxes",
]

const heroVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.15 + index * 0.08,
      type: "spring",
      stiffness: 120,
      damping: 18,
    },
  }),
}

const cardHover = {
  rest: { y: 0, scale: 1, rotateX: 0 },
  hover: {
    y: -6,
    scale: 1.01,
    rotateX: 2,
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
}

const LivePreviewTimeline = () => {
  const { branding } = useBranding()
  const brandAccent = branding.primaryColor || '#0ea5e9'
  const brandGradient = useMemo(
    () => `linear-gradient(135deg, ${branding.primaryColor || '#0ea5e9'} 0%, ${branding.accentColor || '#14b8a6'} 100%)`,
    [branding.primaryColor, branding.accentColor]
  )

  return (
    <Motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.45 }}
      transition={{ type: "spring", stiffness: 130, damping: 22 }}
      className="relative overflow-hidden rounded-[42px] border border-white/15 bg-white/85 p-10 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.75)] backdrop-blur-2xl dark:border-slate-700/70 dark:bg-slate-900/70"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
      <div className="relative flex flex-col gap-6 text-slate-900 dark:text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-600 shadow-sm dark:border-slate-700/60 dark:bg-slate-950/50 dark:text-slate-300">
            Live preview
          </span>
          <Button
            variant="outline"
            className="border-white/50 bg-white/70 text-xs font-semibold uppercase tracking-[0.35em] dark:border-slate-700/70 dark:bg-slate-900/60"
            style={{ borderColor: brandAccent, color: brandAccent }}
          >
            Try demo
          </Button>
        </div>
        <div>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">File taxes in four guided stages</h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Visualise each compliance step in real time as statements sync, categories are reconciled, and filings get ready for submission.
          </p>
        </div>
        <div className="relative mt-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {livePreviewSteps.map((step, index) => (
            <div
              key={step}
              className="relative flex flex-col gap-3 rounded-3xl border border-white/40 bg-white/80 p-5 text-left shadow-[0_16px_45px_-28px_rgba(15,23,42,0.6)] transition-transform duration-300 dark:border-slate-700/60 dark:bg-slate-900/70"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-lg"
                style={{ backgroundImage: brandGradient }}
              >
                {index + 1}
              </span>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{step}</p>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {index === 0 && "Import statements securely from banking, credit and ERP sources."}
                {index === 1 && "AI cleanses your ledger in minutes with smart tagging and anomaly checks."}
                {index === 2 && "Cross-verify liabilities with collaborative review notes and approvals."}
                {index === 3 && "File with one click and distribute filings to clients with bureau-ready exports."}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Motion.div>
  )
}

const LivePreviewPanel = () => (
  <Motion.div
    initial={{ opacity: 0, y: 36 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.35 }}
    transition={{ delay: 0.1, type: "spring", stiffness: 130, damping: 22 }}
    className="relative overflow-hidden rounded-[46px] border border-white/15 bg-[linear-gradient(160deg,rgba(13,148,136,0.25)_0%,rgba(14,165,233,0.2)_35%,rgba(79,70,229,0.28)_100%)] p-8 shadow-[0_32px_80px_-45px_rgba(14,165,233,0.8)] backdrop-blur-2xl dark:border-slate-700/70"
  >
    <div className="absolute inset-x-8 top-8 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    <div className="relative flex flex-col gap-6 text-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Workspace status</p>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight">CIBIL health monitor</h3>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/80">
          Synced
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
        </span>
      </div>
      <div className="grid gap-4">
        <div className="flex items-center justify-between rounded-3xl bg-white/10 px-5 py-4 text-sm">
          <div className="flex items-center gap-3">
            <Upload className="h-4 w-4" strokeWidth={1.8} />
            Upload queue
          </div>
          <span className="text-xs text-white/70">Last synced 4 mins ago</span>
        </div>
        <div className="rounded-3xl bg-white/10 p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.28em] text-white/60">Liability forecast</p>
              <p className="text-3xl font-semibold">₹12.6L</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-3 py-2 text-xs font-medium">Optimised</div>
          </div>
          <div className="mt-5 grid gap-3 text-xs text-white/75">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Smart categorisation</span>
              <span>99% match</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2"><Fingerprint className="h-3.5 w-3.5 text-cyan-200" /> Fraud checks</span>
              <span>No alerts</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2"><GaugeCircle className="h-3.5 w-3.5 text-sky-200" /> Filing automation</span>
              <span>On track</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-3xl bg-white/10 px-5 py-4 text-xs uppercase tracking-[0.35em] text-white/70">
          <span>Next action</span>
          <span className="flex items-center gap-2 text-white">
            Review calculations
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  </Motion.div>
)

const LivePreviewSection = () => (
  <section id="features" className="relative overflow-visible">
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <LivePreviewTimeline />
      <LivePreviewPanel />
    </div>
  </section>
)

const SecurityPanel = () => (
  <Motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.45 }}
    transition={{ type: "spring", stiffness: 130, damping: 22 }}
    className="relative overflow-hidden rounded-[42px] border border-white/15 bg-white/85 p-10 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.78)] backdrop-blur-2xl dark:border-slate-700/70 dark:bg-slate-900/70"
  >
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/10 via-cyan-400/12 to-emerald-400/12" />
    <div className="relative space-y-6 text-slate-900 dark:text-white">
      <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-600 shadow-sm dark:border-slate-700/60 dark:bg-slate-950/50 dark:text-slate-300">
        Security + regulatory
      </span>
      <div className="space-y-4">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight">Auditor-grade controls on day one</h2>
        <p className="max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Maintain bureau compliance with granular access control, encrypted vaults and proactive review trails that keep every filing ready for scrutiny.
        </p>
      </div>
      <div className="grid gap-4 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex items-start gap-3 rounded-3xl border border-white/40 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.65)] dark:border-slate-700/60 dark:bg-slate-900/70">
          <Building2 className="mt-1 h-5 w-5 text-sky-500" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">Enterprise key management</p>
            <p className="mt-2 text-xs leading-relaxed">Vault-grade encryption with India data residency meets SOC 2 and ISO requirements automatically.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-3xl border border-white/40 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.65)] dark:border-slate-700/60 dark:bg-slate-900/70">
          <ShieldCheck className="mt-1 h-5 w-5 text-emerald-400" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">Continuous audit trails</p>
            <p className="mt-2 text-xs leading-relaxed">Versioned filings and e-signed approvals create airtight histories for regulators and clients.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-3xl border border-white/40 bg-white/80 p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.65)] dark:border-slate-700/60 dark:bg-slate-900/70">
          <Sparkle className="mt-1 h-5 w-5 text-purple-400" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">AI compliance concierge</p>
            <p className="mt-2 text-xs leading-relaxed">Guided playbooks surface variances instantly, helping your firm resolve issues before audits begin.</p>
          </div>
        </div>
      </div>
    </div>
  </Motion.div>
)

const PricingPanel = () => {
  const { branding } = useBranding()
  const brandAccent = branding.primaryColor || '#0ea5e9'
  const gradientButtonStyle = useMemo(
    () => ({
      backgroundImage: `linear-gradient(135deg, ${branding.primaryColor || '#0ea5e9'} 0%, ${branding.accentColor || '#14b8a6'} 100%)`,
    }),
    [branding.primaryColor, branding.accentColor]
  )

  return (
    <Motion.div
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 130, damping: 22 }}
      className="relative isolate overflow-hidden rounded-[48px] border border-white/15 bg-white/90 p-10 shadow-[0_40px_95px_-45px_rgba(15,23,42,0.85)] backdrop-blur-2xl dark:border-slate-700/70 dark:bg-slate-900/70"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/12 via-cyan-400/12 to-emerald-400/14" />
      <div className="relative space-y-8 text-slate-900 dark:text-white">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-500/80 dark:text-sky-300/90">Pricing</p>
          <h3 className="text-3xl font-semibold tracking-tight">Tailored for ambitious firms</h3>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Start free, upgrade when you need unlimited filings, audit packs and dedicated success specialists.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
          <div className="relative flex h-full flex-col justify-between rounded-[40px] border border-white/20 bg-white/85 p-8 shadow-[0_30px_70px_-38px_rgba(14,116,144,0.6)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-950/60">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-500/80 dark:text-sky-300/80">Free</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-4xl font-semibold">₹0</span>
                  <span className="mb-1 text-xs uppercase text-slate-500 dark:text-slate-300">per month</span>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Upload 5 statements monthly, invite 2 teammates, and automate reconciliation with AI tagging.
              </p>
            </div>
            <ul className="mt-6 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Smart categorisation for core ledgers
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Secure document vault with history
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Basic anomaly alerts for filings
              </li>
            </ul>
            <Button
              variant="outline"
              size="lg"
              className="mt-8 rounded-full text-base font-semibold shadow-[0_20px_45px_-30px_rgba(14,165,233,0.45)]"
              style={{ borderColor: brandAccent, color: brandAccent }}
            >
              Start for free
            </Button>
          </div>
          <div className="relative flex h-full flex-col justify-between rounded-[40px] border border-white/20 bg-white/90 p-8 shadow-[0_30px_70px_-32px_rgba(14,116,144,0.7)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-950/70">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-500/80 dark:text-sky-300/80">Pro</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-5xl font-semibold">₹7,499</span>
                  <span className="mb-1 text-xs uppercase text-slate-500 dark:text-slate-300">per filing</span>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Scale to unlimited filings with concierge support, granular access policies, and bureau-ready health reports.
              </p>
            </div>
            <ul className="mt-6 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Unlimited filings & smart ingestion
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Dedicated compliance concierge
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Bureau health reports for clients
              </li>
            </ul>
            <Button
              size="lg"
              className="mt-8 rounded-full px-8 text-base font-semibold text-white shadow-[0_20px_45px_-25px_rgba(14,165,233,0.65)]"
              style={gradientButtonStyle}
            >
              Choose plan
            </Button>
          </div>
        </div>
      </div>
    </Motion.div>
  )
}

const SecurityPricingSection = () => (
  <section id="security" className="relative overflow-visible">
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <SecurityPanel />
      <div id="pricing" className="flex justify-end">
        <PricingPanel />
      </div>
    </div>
  </section>
)

const HeroMockupPlaceholder = () => (
  <Motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.35 }}
    transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
    className="relative mx-auto w-full pb-12 pl-6 pr-4 sm:pl-8 sm:pr-6 lg:pb-0 lg:self-center lg:pl-12 xl:pl-16"
  >
    <div className="relative mx-auto aspect-[3/2] w-full max-w-[1400px] lg:w-[150%] xl:w-[180%]">
      <img
        src="/images/hero-laptop.png"
        alt="TaxWise dashboard mockup"
        className="absolute left-69 top-[52%] w-full max-w-[820px] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_32px_90px_-38px_rgba(15,23,42,0.7)] sm:w-[120%] sm:max-w-[1020px] md:w-[150%] md:max-w-[1080px] lg:w-[180%] lg:max-w-[1020px] xl:w-[220%]"
      />
    </div>
  </Motion.div>
)

const LandingPage = ({ theme }) => {
  const { branding } = useBranding()
  const gradientOverlayStyle = useMemo(() => {
    const primary = branding.primaryColor || '#0ea5e9'
    const accent = branding.accentColor || '#14b8a6'
    if (theme === 'dark') {
      return {
        background: `radial-gradient(circle at 10% 10%, ${primary}40 0%, transparent 55%), radial-gradient(circle at 80% 0%, ${accent}33 0%, transparent 52%), radial-gradient(circle at 60% 80%, rgba(16,185,129,0.25) 0%, transparent 60%)`,
      }
    }
    return {
      background: `radial-gradient(circle at 8% 12%, ${primary}26 0%, transparent 55%), radial-gradient(circle at 75% 15%, ${accent}24 0%, transparent 55%), radial-gradient(circle at 52% 80%, rgba(45,212,191,0.14) 0%, transparent 60%)`,
    }
  }, [branding.accentColor, branding.primaryColor, theme])
  const brandGradient = useMemo(
    () => `linear-gradient(90deg, ${branding.primaryColor || '#0ea5e9'} 0%, ${branding.accentColor || '#14b8a6'} 100%)`,
    [branding.primaryColor, branding.accentColor]
  )
  const gradientButtonStyle = useMemo(() => ({ backgroundImage: brandGradient }), [brandGradient])
  const brandAccent = branding.primaryColor || '#0ea5e9'
  const navigate = useNavigate()
  const { status } = useAuth()
  const fileInputRef = useRef(null)
  const {
    handleUpload: uploadStatement,
    isUploading,
    uploadStatus,
    uploadError,
    notification,
    dismissNotification,
  } = useStatementUpload({})

  const handleUploadClick = () => {
    if (status === "authenticated") {
      fileInputRef.current?.click()
    } else if (status !== "checking") {
      navigate(`/aadhaar-auth?mode=login&next=${encodeURIComponent('/dashboard/filings')}`)
    }
  }

  const handleFileChange = async (event) => {
    const files = event.target.files
    if (!files?.length) return
    try {
      await uploadStatement(files[0])
    } catch {
      // Errors are surfaced via uploadError/notification state
    } finally {
      event.target.value = ""
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
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
      <div
        className="pointer-events-none absolute inset-0 opacity-90 blur-[120px] transition-colors duration-700"
        style={gradientOverlayStyle}
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[96rem] flex-col px-6 pb-24 pt-10 sm:px-8 lg:px-12">
          <header className="z-10 flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <LogoBadge size="md" className="px-2" />
              <nav
                className="hidden items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300 lg:flex"
                style={{ '--brand-primary': brandAccent }}
              >
                {["Features", "Pricing", "Security", "Help"].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    className="tracking-tight transition-colors hover:text-[color:var(--brand-primary)]"
                  >
                    {item}
                  </a>
                ))}
                <Link
                  to="/tax-calculator"
                  className="tracking-tight transition-colors hover:text-[color:var(--brand-primary)] font-medium text-slate-800 dark:text-slate-200"
                >
                  Calculator
                </Link>
              </nav>
              <div className="flex items-center gap-3">
                {status === "authenticated" ? (
                  <>
                    <Button
                      variant="ghost"
                      className="text-sm font-semibold uppercase tracking-wide"
                      onClick={() => navigate("/dashboard/profile")}
                    >
                      Profile
                    </Button>
                    <Button
                      size="lg"
                      className="text-white shadow-[0_16px_40px_-24px_rgba(14,165,233,0.6)]"
                      style={gradientButtonStyle}
                      onClick={() => navigate("/dashboard")}
                    >
                      Open Dashboard
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="text-sm font-semibold uppercase tracking-wide" asChild>
                      <Link to="/aadhaar-auth?mode=login&next=%2Fdashboard">Log In</Link>
                    </Button>
                    <Button size="lg" className="text-white shadow-[0_16px_40px_-24px_rgba(14,165,233,0.6)]" style={gradientButtonStyle} asChild>
                      <Link to="/digilocker-auth">Create Workspace</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="md:hidden">
              <nav
                className="flex flex-wrap gap-4 text-sm font-medium text-slate-600 dark:text-slate-300"
                style={{ '--brand-primary': brandAccent }}
              >
                {["Features", "Pricing", "Security", "Help"].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    className="rounded-full border border-white/30 px-4 py-2 backdrop-blur transition-colors hover:border-[color:var(--brand-primary)] hover:text-[color:var(--brand-primary)] dark:border-slate-700/70"
                  >
                    {item}
                  </a>
                ))}
                <Link
                  to="/tax-calculator"
                  className="rounded-full border border-white/30 px-4 py-2 backdrop-blur transition-colors hover:border-[color:var(--brand-primary)] hover:text-[color:var(--brand-primary)] dark:border-slate-700/70 font-medium text-slate-800 dark:text-slate-200"
                >
                  Calculator
                </Link>
              </nav>
            </div>
          </header>

          <main className=" flex flex-1 flex-col gap-20">
            <section className="relative grid items-start gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:pl-8 xl:pl-12">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/30 bg-white/60 px-5 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-slate-600 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-300 mb-5">
                  Smarter tax filing
                </div>
                <Motion.div initial="hidden" animate="visible">
                  <Motion.h1
                    variants={heroVariants}
                    className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-[3.1rem] lg:leading-[1.1] dark:text-white"
                  >
                    Smarter tax filing & CIBIL health, automatically
                  </Motion.h1>
                  <Motion.p
                    variants={heroVariants}
                    custom={1}
                    className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300"
                  >
                    Upload your financial statements, get instant AI-led reviews, and improve your credit score while ensuring full compliance.
                  </Motion.p>
                </Motion.div>
                <Motion.div
                  className="flex flex-wrap items-center gap-4"
                  initial="hidden"
                  animate="visible"
                >
                  <Motion.div variants={heroVariants} custom={2}>
                    <Button
                      size="lg"
                      className="text-white shadow-[0_20px_45px_-25px_rgba(14,165,233,0.65)]"
                      style={gradientButtonStyle}
                      asChild
                    >
                      <Link to="/tax-calculator">
                        Try calculator
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </Motion.div>
                  <Motion.div variants={heroVariants} custom={3}>
                    <Button
                      variant="outline"
                      size="lg"
                      className="bg-white/80 shadow-sm backdrop-blur dark:bg-slate-900/60"
                      style={{ borderColor: brandAccent, color: brandAccent }}
                      onClick={handleUploadClick}
                      disabled={isUploading || status === "checking"}
                    >
                      {isUploading ? "Uploading…" : "Upload statements"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Motion.div>
                </Motion.div>
                {status === "authenticated" ? (
                  <div className="space-y-1 text-xs">
                    {uploadStatus && (
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-emerald-600 dark:text-emerald-300">{uploadStatus}</p>
                        <Button
                          variant="link"
                          className="px-0 text-xs font-semibold"
                          style={{ color: brandAccent }}
                          onClick={() => navigate("/dashboard/filings")}
                        >
                          View filings
                        </Button>
                      </div>
                    )}
                    {uploadError && <p className="text-rose-500">{uploadError}</p>}
                    {!uploadStatus && !uploadError && (
                      <p className="text-slate-500 dark:text-slate-400">
                        Supported formats: CSV, XLS, XLSX. Files stay private to your workspace.
                      </p>
                    )}
                  </div>
                ) : status !== "checking" ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    You’ll be prompted to sign in before uploading, and we’ll route you back to filings after login.
                  </p>
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  onChange={handleFileChange}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  {heroStats.map((stat, index) => (
                    <Motion.div
                      key={stat.label}
                      initial="rest"
                      whileHover="hover"
                      animate="rest"
                      variants={cardHover}
                      transition={{ delay: index * 0.06 }}
                      className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/80 p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.65)] backdrop-blur-lg dark:border-slate-700/60 dark:bg-slate-900/60"
                    >
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
                      <div className="relative flex items-start gap-4">
                        <div
                          className="mt-1 flex items-center justify-center rounded-full p-2 text-white shadow-lg"
                          style={{ backgroundImage: brandGradient }}
                        >
                          <stat.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{stat.label}</p>
                          <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{stat.description}</p>
                        </div>
                      </div>
                    </Motion.div>
                  ))}
                </div>
              </div>
              <HeroMockupPlaceholder />
            </section>

            <LivePreviewSection />

            <SecurityPricingSection />
          </main>

          <footer
            id="help"
            className="mt-24 grid gap-8 rounded-3xl border border-white/10 bg-white/70 p-8 text-sm text-slate-500 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.65)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-400"
          >
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                <BarChart3 className="h-5 w-5" />
                TaxWise © {new Date().getFullYear()} | Financial Intelligence Suite
              </div>
              <div className="flex flex-wrap items-center gap-4" style={{ '--brand-primary': brandAccent }}>
                <a href="#security" className="transition-colors hover:text-[color:var(--brand-primary)]">
                  Security
                </a>
                <a href="#pricing" className="transition-colors hover:text-[color:var(--brand-primary)]">
                  Pricing
                </a>
                <a href="#features" className="transition-colors hover:text-[color:var(--brand-primary)]">
                  Features
                </a>
                <a href="#help" className="transition-colors hover:text-[color:var(--brand-primary)]">
                  Help Centre
                </a>
              </div>
            </div>
          </footer>
        </div>
      </div>
  )
}

const AuthPage = ({ theme }) => {
  const { branding } = useBranding()
  const gradientOverlayStyle = useMemo(() => {
    const primary = branding.primaryColor || '#0ea5e9'
    const accent = branding.accentColor || '#14b8a6'
    if (theme === 'dark') {
      return {
        background: `radial-gradient(circle at 10% 10%, ${primary}40 0%, transparent 55%), radial-gradient(circle at 80% 0%, ${accent}33 0%, transparent 52%), radial-gradient(circle at 60% 80%, rgba(16,185,129,0.25) 0%, transparent 60%)`,
      }
    }
    return {
      background: `radial-gradient(circle at 8% 12%, ${primary}26 0%, transparent 55%), radial-gradient(circle at 75% 15%, ${accent}24 0%, transparent 55%), radial-gradient(circle at 52% 80%, rgba(45,212,191,0.14) 0%, transparent 60%)`,
    }
  }, [branding.accentColor, branding.primaryColor, theme])
  const brandGradient = useMemo(
    () => `linear-gradient(90deg, ${branding.primaryColor || '#0ea5e9'} 0%, ${branding.accentColor || '#14b8a6'} 100%)`,
    [branding.primaryColor, branding.accentColor]
  )
  const gradientButtonStyle = useMemo(() => ({ backgroundImage: brandGradient }), [brandGradient])
  const brandAccent = branding.primaryColor || '#0ea5e9'
  const [searchParams] = useSearchParams()
  const requestedMode = searchParams.get("mode") === "signup" ? "signup" : "login"
  const [tabValue, setTabValue] = useState(requestedMode)

  useEffect(() => {
    setTabValue(requestedMode)
  }, [requestedMode])

  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-90 blur-[120px] transition-colors duration-700"
        style={gradientOverlayStyle}
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 pb-16 pt-10 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/"
            className="rounded-full border border-white/20 bg-white/80 px-4 py-2 text-sm font-semibold tracking-tight text-slate-900 shadow-sm backdrop-blur transition-colors hover:border-[color:var(--brand-primary)] hover:text-[color:var(--brand-primary)] dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-white"
            style={{ '--brand-primary': brandAccent }}
          >
            <LogoBadge compact size="sm" showTagline={false} />
          </Link>
          <div className="flex items-center gap-4" style={{ '--brand-primary': brandAccent }}>
            <Button
              variant="ghost"
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: brandAccent }}
              asChild
            >
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        </header>
        <div className="mt-12 grid flex-1 gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <Motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 24 }}
            className="flex flex-col justify-between gap-10 rounded-4xl border border-white/15 bg-white/75 p-8 shadow-[0_25px_65px_-35px_rgba(15,23,42,0.75)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/60"
          >
            <div className="space-y-6 text-slate-700 dark:text-slate-300">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-600 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300">
                Secure Access
              </p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">
                Welcome to the TaxWise command centre
              </h1>
              <p className="max-w-md text-base leading-relaxed">
                Manage clients, filings, and compliance workflows from one secure console. Register with Aadhaar QR/XML or login with your generated credentials.
              </p>
              <ul className="space-y-4 text-sm leading-relaxed">
                <li className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-400" />
                  Secure Aadhaar-based authentication with encrypted identity verification.
                </li>
                <li className="flex items-start gap-3">
                  <Fingerprint className="mt-0.5 h-4 w-4 text-sky-400" />
                  Fine-grained access policies so partners, analysts, and auditors only see what they need.
                </li>
                <li className="flex items-start gap-3">
                  <Layers3 className="mt-0.5 h-4 w-4 text-indigo-400" />
                  Unified workspace linking filings, reconciliations, and credit health scores.
                </li>
              </ul>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <GaugeCircle className="h-4 w-4 text-sky-400" />
                Real-time anomaly detection
              </div>
              <div className="flex items-center gap-2">
                <Sparkle className="h-4 w-4 text-purple-400" />
                AI insights on every login
              </div>
            </div>
          </Motion.section>
          <Motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08, type: "spring", stiffness: 120, damping: 24 }}
            className="flex items-center justify-center"
          >
            <Card className="w-full max-w-md rounded-4xl border-white/15 bg-white/80 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.85)] backdrop-blur-2xl dark:border-slate-700/60 dark:bg-slate-900/70">
              <CardHeader className="space-y-2 pb-4 text-center">
                <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  Access your workspace
                </CardTitle>
                <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
                  Secure Aadhaar-based authentication. New users register with Aadhaar, returning users login with name + password.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={tabValue} onValueChange={setTabValue} className="space-y-6">
                  <TabsList
                    className="grid grid-cols-2 rounded-full bg-slate-200/60 p-1 text-sm font-semibold text-slate-600 dark:bg-slate-800/70 dark:text-slate-300"
                    style={{ '--brand-primary': brandAccent, '--brand-primary-soft': `${brandAccent}33` }}
                  >
                    <TabsTrigger
                      value="login"
                      className="rounded-full px-4 py-2 transition-colors data-[state=active]:bg-[color:var(--brand-primary-soft)] data-[state=active]:text-[color:var(--brand-primary)]"
                    >
                      Existing User
                    </TabsTrigger>
                    <TabsTrigger
                      value="signup"
                      className="rounded-full px-4 py-2 transition-colors data-[state=active]:bg-[color:var(--brand-primary-soft)] data-[state=active]:text-[color:var(--brand-primary)]"
                    >
                      New User
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="login" className="space-y-6">
                    <Motion.div
                      key="login"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 150, damping: 20 }}
                      className="space-y-5"
                    >
                      <div className="space-y-3 text-center">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Login with your name and generated password
                        </p>
                        <Button size="lg" className="w-full justify-center text-white" style={gradientButtonStyle} asChild>
                          <Link to="/aadhaar-auth?mode=login">
                            Continue to Login
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                        Secure Authentication
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                      </div>
                      <div className="space-y-2 text-center text-xs text-slate-500 dark:text-slate-400">
                        <p>🛡️ Password generated from your Aadhaar details</p>
                        <p>🔒 Forgot password? Re-verify with Aadhaar QR/XML</p>
                      </div>
                    </Motion.div>
                  </TabsContent>
                  <TabsContent value="signup" className="space-y-6">
                    <Motion.div
                      key="signup"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 150, damping: 20 }}
                      className="space-y-5"
                    >
                      <div className="space-y-3 text-center">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Register with DigiLocker QR scanner or upload Aadhaar
                        </p>
                        <Button size="lg" className="w-full justify-center text-white" style={gradientButtonStyle} asChild>
                          <Link to="/digilocker-auth">
                            Scan with DigiLocker
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        <Button size="lg" variant="outline" className="w-full justify-center" style={{ borderColor: brandAccent, color: brandAccent }} asChild>
                          <Link to="/digilocker-auth">
                            Or Upload Manually
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                        Secure KYC Process
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                      </div>
                      <div className="space-y-2 text-center text-xs text-slate-500 dark:text-slate-400">
                        <p>🚀 DigiLocker scanner opens automatically</p>
                        <p>📱 Scan your Aadhaar QR code</p>
                        <p>✨ Form auto-fills with your data</p>
                        <p>🔐 Automatic secure password generation</p>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        By continuing you agree to the TaxWise Terms of Service and Data Protection Policy.
                      </p>
                    </Motion.div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </Motion.section>
        </div>
      </div>
    </div>
  )
}

const LoadingScreen = ({ theme }) => (
  <div
    className={cn(
      "flex min-h-screen items-center justify-center bg-gradient-to-br transition-colors",
      theme === "dark"
        ? "from-slate-950 via-[#050a15] to-slate-900"
        : "from-slate-100 via-white to-slate-200"
    )}
  >
    <Motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500/70 via-cyan-400/70 to-emerald-400/70 shadow-[0_30px_90px_-40px_rgba(14,165,233,0.7)]"
    >
      <Motion.div
        className="h-10 w-10 rounded-2xl border-2 border-white/70"
        animate={{ rotate: [0, 180, 360] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
      />
    </Motion.div>
  </div>
)

const App = () => {
  const theme = "dark"
  const { status } = useAuth()

  useEffect(() => {
    const root = document.documentElement
    root.classList.add("dark")
    return () => root.classList.remove("dark")
  }, [])

  const requireAuth = (element) => {
    if (status === "checking") {
      return <LoadingScreen theme={theme} />
    }
    if (status !== "authenticated") {
      return <Navigate to="/aadhaar-auth?mode=login" replace />
    }
    return element
  }

  const requireGuest = (element) => {
    if (status === "checking") {
      return <LoadingScreen theme={theme} />
    }
    if (status === "authenticated") {
      return <Navigate to="/dashboard" replace />
    }
    return element
  }

  const landingElement = status === "checking"
    ? <LoadingScreen theme={theme} />
    : <LandingPage theme={theme} />

  return (
    <BrandingProvider>
      <div
        className={cn(
          "min-h-screen transition-colors duration-700",
          theme === "dark" ? "bg-[#050a15] text-slate-100" : "bg-slate-50 text-slate-900"
        )}
      >
        <Routes>
          <Route path="/" element={landingElement} />
          <Route path="/tax-calculator" element={<TaxCalculatorPage theme={theme} />} />
          <Route path="/auth" element={requireGuest(<AuthPage theme={theme} />)} />
          <Route path="/aadhaar-auth" element={requireGuest(<AadhaarAuthPage theme={theme} />)} />
          <Route path="/digilocker-auth" element={requireGuest(<DigiLockerAuthPage theme={theme} />)} />
          <Route
            path="/dashboard/*"
            element={requireAuth(<DashboardLayout theme={theme} />)}
          >
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<DashboardOverview />} />
            <Route path="analytics" element={<DashboardAnalytics />} />
            <Route path="predictions" element={<DashboardPredictions />} />
            <Route path="filings" element={<DashboardFilings />} />
            <Route path="voice-input" element={<DashboardVoiceInput />} />
            <Route path="profile" element={<DashboardProfile />} />
            <Route path="branding" element={<DashboardBranding />} />
            <Route path="kyc-refresh" element={<DashboardKycRefresh />} />
            <Route path="runbooks/:runbookId" element={<DashboardRunbook />} />
            
            <Route path="blockchain" element={<BlockchainInsurance />} />
          </Route>
        </Routes>
      </div>
    </BrandingProvider>
  )
}

export default App
