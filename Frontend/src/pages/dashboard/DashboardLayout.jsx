'use client'

import React, { useMemo, useState } from "react"
import { Link, NavLink, Outlet } from "react-router-dom"
import {
  ArrowRight,
  Home,
  LineChart,
  FileStack,
  Users2,
  UserCog,
  Palette,
  PhoneCall,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "../../components/ui/button"
import { useAuth } from "../../contexts/AuthContext"
import LogoBadge from "../../components/logo"
import { cn } from "../../lib/utils"
import { useCreditAdvisor } from "../../hooks/useCreditAdvisor"
import GeminiChatDock from "../../components/chat/GeminiChatDock"
import { useBranding } from "../../contexts/BrandingContext"

const dashboardLinks = [
  { to: "overview", label: "Overview", icon: Home },
  { to: "analytics", label: "Analytics", icon: LineChart },
  { to: "filings", label: "Filings", icon: FileStack },
  { to: "clients", label: "Clients", icon: Users2 },
  { to: "profile", label: "Profile", icon: UserCog },
  { to: "branding", label: "Branding", icon: Palette },
  { to: "advisor", label: "CA Session", icon: PhoneCall },
]

const MotionDiv = motion.div

const buildDashboardPath = (slug) => `/dashboard/${slug}`

export const DashboardLayout = ({ theme }) => {
  const { user, signOut } = useAuth()
  const { branding } = useBranding()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const gradientOverlayStyle = useMemo(() => {
    const primary = branding.primaryColor || '#0ea5e9'
    const accent = branding.accentColor || '#14b8a6'
    if (theme === 'dark') {
      return {
        background: `radial-gradient(circle at 10% 10%, ${primary}40 0%, transparent 55%), radial-gradient(circle at 80% 0%, ${accent}33 0%, transparent 52%), radial-gradient(circle at 60% 80%, rgba(16,185,129,0.25) 0%, transparent 60%)`,
      }
    }
    return {
      background: `radial-gradient(circle at 8% 12%, ${primary}2c 0%, transparent 55%), radial-gradient(circle at 75% 15%, ${accent}29 0%, transparent 55%), radial-gradient(circle at 52% 80%, rgba(45,212,191,0.14) 0%, transparent 60%)`,
    }
  }, [branding.accentColor, branding.primaryColor, theme])

  const layoutColumns = isCollapsed ? 'lg:grid-cols-[120px_1fr]' : 'lg:grid-cols-[250px_1fr]'

  const initials = useMemo(() => {
    if (!user?.name) return "TW"
    return user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
  }, [user?.name])

  const closeMobileNav = () => setMobileOpen(false)

  const {
    profile: creditProfile,
    loading: loadingAdvisor,
    error: advisorError,
  } = useCreditAdvisor()

  const estimatedScore = creditProfile?.estimatedScore ?? creditProfile?.score ?? null
  const scoreLabel = estimatedScore ? `${estimatedScore}/900` : loadingAdvisor ? "Syncing" : "No score yet"

  const AdvisorBadge = () => (
    <div
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-sky-400/30 bg-white/90 px-3 py-2 text-left shadow-[0_20px_45px_-30px_rgba(59,130,246,0.6)] backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/70 sm:w-48"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-sky-600 dark:text-sky-300">
          CIBIL score
        </p>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">{scoreLabel}</p>
      </div>
      {loadingAdvisor ? (
        <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
      ) : advisorError ? (
        <AlertTriangle className="h-4 w-4 text-amber-500" />
      ) : (
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
      )}
    </div>
  )

  return (
    <div
      style={{ '--brand-primary': branding.primaryColor, '--brand-accent': branding.accentColor }}
      className={cn(
        "relative min-h-screen w-full overflow-hidden transition-colors duration-700",
        theme === "dark"
          ? "bg-[#050a15] text-slate-200"
          : "bg-gradient-to-br from-[#f6faff] via-[#f0f7ff] to-white text-slate-900"
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 opacity-90 blur-[140px]")} style={gradientOverlayStyle} />
      <div className={cn("relative mx-auto flex min-h-screen max-w-7xl flex-col pb-12 pt-8  lg:grid lg:gap-5 ", layoutColumns, "transition-all duration-300 ease-out") }>
        <aside
          className={cn(
            "relative z-10 mb-8 flex items-center justify-between overflow-hidden rounded-3xl border border-white/15 bg-white/80 px-4 py-4 shadow-[0_20px_50px_-32px_rgba(14,116,144,0.6)] backdrop-blur-md transition-all duration-300 ease-out dark:border-slate-700/70 dark:bg-slate-900/70 lg:sticky lg:top-8 lg:mb-0 lg:flex lg:h-[calc(100vh-50px)] lg:flex-col lg:items-stretch lg:overflow-hidden",
            isCollapsed ? "lg:w-[120px] lg:px-3" : "lg:w-[250px] lg:px-5"
          )}
        >
          <div
            className={cn(
              "flex w-full items-center gap-3 transition-all duration-300 lg:flex-col",
              isCollapsed
                ? "justify-center lg:items-center lg:gap-4"
                : "justify-between lg:items-stretch lg:gap-6"
            )}
          >
            <Link
              to="/"
              className={cn(
                "flex items-center justify-center rounded-full border border-white/30 bg-white/70 shadow-sm transition-all duration-300 hover:border-sky-400/60 dark:border-slate-700/70 dark:bg-slate-950/50",
                isCollapsed ? "w-19" : "w-full"
              )}
            >
              <LogoBadge
                compact={isCollapsed}
                size="md"
                showTagline={!isCollapsed}
                align="center"
                className="mx-auto select-none"
              />
            </Link>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="hidden h-9 w-9 items-center justify-center border-white/30 bg-white/70 text-slate-600 hover:text-slate-900 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200 lg:flex"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </Button>
          </div>

          <div className="mt-4 hidden w-full lg:block">
            <div className="relative flex min-h-[140px] items-center justify-center">
              <AnimatePresence initial={false} mode="wait">
                {!isCollapsed ? (
                  <MotionDiv
                    key="profile-expanded"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18 }}
                    className="w-full rounded-3xl border border-white/20 bg-white/75 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70"
                  >
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.name || "Partner"}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email || "No email on file"}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Role</span>
                      <span className="font-semibold uppercase tracking-[0.32em] text-sky-500 dark:text-sky-300">{(user?.role || "user").toUpperCase()}</span>
                    </div>
                  </MotionDiv>
                ) : (
                  <MotionDiv
                    key="profile-collapsed"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.18 }}
                    className="flex h-full w-full items-center justify-center"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/80 via-cyan-400/80 to-emerald-400/80 text-sm font-semibold text-white">
                      {initials}
                    </div>
                  </MotionDiv>
                )}
              </AnimatePresence>
            </div>
          </div>

          <nav className="mt-6 hidden h-full flex-1 flex-col text-sm font-medium text-slate-600 dark:text-slate-300 lg:flex">
            <div
              className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none' }}
            >
              {dashboardLinks.map(({ to, label, icon }) => {
                const IconComponent = icon
                return (
                  <MotionDiv key={to} layout>
                    <NavLink
                      to={buildDashboardPath(to)}
                      title={label}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center rounded-2xl border border-transparent py-3 transition-all duration-300",
                          isCollapsed ? "justify-center px-3" : "gap-3 px-4",
                          "hover:border-sky-400/50 hover:text-sky-500 dark:hover:border-sky-500/50 dark:hover:text-sky-300",
                          isActive
                            ? "border-sky-400/60 bg-sky-500/10 text-sky-600 dark:border-sky-500/60 dark:bg-sky-500/10 dark:text-sky-200"
                            : "bg-transparent"
                        )
                      }
                      end={to === "overview"}
                    >
                      <IconComponent className="h-5 w-5" />
                      {isCollapsed ? <span className="sr-only">{label}</span> : label}
                    </NavLink>
                  </MotionDiv>
                )
              })}
            </div>
            <div className="mt-4 shrink-0">
              <Button
                variant="ghost"
                onClick={signOut}
                className={cn(
                  "w-full rounded-2xl border border-transparent py-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 transition-all duration-300 hover:border-sky-400/50 hover:text-slate-800 dark:text-slate-400",
                  isCollapsed ? "justify-center gap-0" : "justify-start gap-3 px-4"
                )}
              >
                <LogOut className="h-5 w-5" />
                {isCollapsed ? <span className="sr-only">Sign out</span> : "Sign out"}
              </Button>
            </div>
          </nav>
          <div className="flex items-center gap-3 lg:hidden">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setMobileOpen(true)}
              className="border-white/30 bg-white/70 dark:border-slate-700/60 dark:bg-slate-900/70"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <span className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">Menu</span>
          </div>
        </aside>
        <main className="relative flex flex-1 flex-col gap-6">
          <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/75 px-6 py-5 shadow-[0_22px_45px_-30px_rgba(15,23,42,0.6)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  {branding.firmName || "Workspace"} dashboard
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {branding.tagline || "Monitor filings, credit health, and team operations in real time."}
                </p>
              </div>
              <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                <AdvisorBadge />
                <Button
                  variant="ghost"
                  onClick={signOut}
                  className="relative z-10 w-full rounded-full border border-transparent px-6 text-sm font-semibold uppercase tracking-[0.28em] text-slate-500 transition hover:border-rose-400/50 hover:text-rose-500 dark:text-slate-300 dark:hover:text-rose-300 sm:w-auto"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
              {dashboardLinks.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={buildDashboardPath(to)}
                  className={({ isActive }) =>
                    cn(
                      "whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] transition-all",
                      "border-white/30 text-slate-600 hover:border-sky-400/60 hover:text-sky-500 dark:border-slate-700/60 dark:text-slate-300 dark:hover:border-sky-500/60 dark:hover:text-sky-200",
                      isActive ? "bg-sky-500/10 text-sky-600 dark:text-sky-200" : ""
                    )
                  }
                  end={to === "overview"}
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </header>
          <section className="flex-1 space-y-6 pb-16">
            <Outlet />
          </section>
        </main>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          >
            <MotionDiv
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="absolute left-0 top-0 flex h-full w-72 flex-col gap-6 rounded-r-3xl border-r border-white/10 bg-white/90 p-6 shadow-2xl dark:border-slate-800/60 dark:bg-slate-900/90"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/80 via-cyan-400/80 to-emerald-400/80 text-white">
                    <span className="text-sm font-semibold">{initials}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{user?.name || "Partner"}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email || "No email"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" onClick={closeMobileNav}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <nav className="flex flex-col gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              {dashboardLinks.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={buildDashboardPath(to)}
                  onClick={closeMobileNav}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center justify-between rounded-2xl border px-4 py-3 transition-all",
                      "border-white/20 hover:border-sky-400/60 hover:text-sky-500 dark:border-slate-700/60 dark:hover:border-sky-500/60 dark:hover:text-sky-300",
                      isActive ? "bg-sky-500/10 text-sky-600 dark:text-sky-200" : "bg-white/80 dark:bg-slate-900/60"
                    )
                  }
                  end={to === "overview"}
                >
                  {label}
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </NavLink>
              ))}
              </nav>
              <div className="mt-auto space-y-3">
                <Button variant="ghost" onClick={() => { closeMobileNav(); signOut() }} className="justify-start gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 hover:text-slate-800 dark:text-slate-400">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
      <GeminiChatDock />
    </div>
  )
}

export default DashboardLayout
