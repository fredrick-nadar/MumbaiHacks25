import React, { useEffect, useMemo, useState } from "react"
import { motion as Motion, AnimatePresence } from "framer-motion"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { BarChart3, ArrowLeft } from "lucide-react"
import { Button } from "../ui/button"
import { cn } from "../../lib/utils"
import LogoBadge from "../logo"
import { useAuth } from "../../contexts/AuthContext"
import { useBranding } from "../../contexts/BrandingContext"

// Import auth components
import AadhaarVerification from "./AadhaarVerification"
import AadhaarReview from "./AadhaarReview"
import AadhaarLogin from "./AadhaarLogin"
import PasswordReset from "./PasswordReset"

const AadhaarAuthPage = ({ theme }) => {
  const { branding } = useBranding()
  const [searchParams, setSearchParams] = useSearchParams()
  const [currentStep, setCurrentStep] = useState("verification") // verification, review, login, reset
  const [verificationData, setVerificationData] = useState(null)
  const navigate = useNavigate()
  const { login } = useAuth()
  const nextParam = searchParams.get("next")
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

  // Check URL parameters to determine initial step
  useEffect(() => {
    const mode = searchParams.get("mode")
    if (mode === "login") {
      setCurrentStep("login")
    } else if (mode === "reset") {
      setCurrentStep("reset")
    } else {
      setCurrentStep("verification")
    }
  }, [searchParams])

  // Handle verification completion
  const handleVerificationComplete = (data) => {
    setVerificationData(data)
    setCurrentStep("review")
  }

  // Handle KYC completion
  const handleKycComplete = (data) => {
    if (data.isNewUser) {
      // For new users, show success and then redirect to login
      setTimeout(() => {
        setCurrentStep("login")
        setSearchParams(nextParam ? { mode: "login", next: nextParam } : { mode: "login" })
      }, 2000)
    } else {
      // For existing users, go directly to login
      setCurrentStep("login")
      setSearchParams(nextParam ? { mode: "login", next: nextParam } : { mode: "login" })
    }
  }

  // Handle login success
  const handleLoginSuccess = (payload) => {
    login(payload)
    const redirect = nextParam || "/dashboard"
    navigate(redirect, { replace: true })
  }

  // Handle forgot password
  const handleForgotPassword = () => {
    setCurrentStep("reset")
    setSearchParams(nextParam ? { mode: "reset", next: nextParam } : { mode: "reset" })
  }

  // Handle password reset completion
  const handleResetComplete = () => {
    setTimeout(() => {
      setCurrentStep("login")
      setSearchParams(nextParam ? { mode: "login", next: nextParam } : { mode: "login" })
    }, 1000)
  }

  // Handle back to login from reset
  const handleBackToLogin = () => {
    setCurrentStep("login")
    setSearchParams(nextParam ? { mode: "login", next: nextParam } : { mode: "login" })
  }

  // Handle back to verification (for new registration)
  const handleBackToVerification = () => {
    setCurrentStep("verification")
    setVerificationData(null)
    setSearchParams(nextParam ? { next: nextParam } : {})
  }

  // Page transitions
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -20 }
  }

  const pageTransition = {
    type: "spring",
    stiffness: 120,
    damping: 24
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90 blur-[120px] transition-colors duration-700"
        style={gradientOverlayStyle}
      />
      
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-16 pt-10 sm:px-8 lg:px-12">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <Link
            to="/"
            className="rounded-full border border-white/20 bg-white/80 px-4 py-2 shadow-sm backdrop-blur transition-colors hover:border-[color:var(--brand-primary)] hover:text-[color:var(--brand-primary)] dark:border-slate-700/60 dark:bg-slate-900/70"
            style={{ '--brand-primary': branding.primaryColor || '#0ea5e9' }}
          >
            <LogoBadge compact size="sm" showTagline={false} />
          </Link>
          <Button
            variant="ghost"
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: brandAccent }}
            asChild
          >
            <Link to="/">Back to Home</Link>
          </Button>
        </header>

        {/* Progress Indicator */}
        {currentStep !== "login" && currentStep !== "reset" && (
          <div className="mb-8 flex justify-center">
            <div className="flex items-center gap-4 rounded-full border border-white/20 bg-white/80 px-6 py-3 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                currentStep === "verification" 
                  ? "bg-sky-500 text-white" 
                  : "bg-emerald-500 text-white"
              )}>
                1
              </div>
              <div className={cn(
                "h-px w-12 transition-colors",
                currentStep === "review" ? "bg-emerald-400" : "bg-slate-300 dark:bg-slate-600"
              )} />
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                currentStep === "verification" 
                  ? "bg-slate-300 text-slate-600 dark:bg-slate-600 dark:text-slate-400"
                  : currentStep === "review"
                  ? "bg-sky-500 text-white"
                  : "bg-emerald-500 text-white"
              )}>
                2
              </div>
            </div>
          </div>
        )}

        {/* Quick Navigation for Login/Reset */}
        {(currentStep === "login" || currentStep === "reset") && (
          <div className="mb-8 flex justify-center">
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/80 px-4 py-2 text-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
              <Button
                variant={currentStep === "login" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setCurrentStep("login")
                  setSearchParams({ mode: "login" })
                }}
                className="rounded-full px-4 text-xs text-white"
                style={currentStep === "login" ? gradientButtonStyle : undefined}
              >
                Login
              </Button>
              <Button
                variant={currentStep === "reset" ? "default" : "ghost"}
                size="sm"
                onClick={handleForgotPassword}
                className="rounded-full px-4 text-xs text-white"
                style={currentStep === "reset" ? gradientButtonStyle : undefined}
              >
                Reset Password
              </Button>
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-600" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToVerification}
                className="rounded-full px-4 text-xs"
              >
                New Registration
              </Button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-1 items-center justify-center">
          <AnimatePresence mode="wait">
            {currentStep === "verification" && (
              <Motion.div
                key="verification"
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
              >
                <AadhaarVerification onVerificationComplete={handleVerificationComplete} />
              </Motion.div>
            )}

            {currentStep === "review" && verificationData && (
              <Motion.div
                key="review"
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
              >
                <AadhaarReview
                  verificationData={verificationData}
                  onComplete={handleKycComplete}
                />
              </Motion.div>
            )}

            {currentStep === "login" && (
              <Motion.div
                key="login"
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
              >
                <AadhaarLogin onLoginSuccess={handleLoginSuccess} onForgotPassword={handleForgotPassword} />
              </Motion.div>
            )}

            {currentStep === "reset" && (
              <Motion.div
                key="reset"
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
              >
                <PasswordReset
                  onResetComplete={handleResetComplete}
                  onBackToLogin={handleBackToLogin}
                />
              </Motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Powered by Aadhaar e-KYC • Secure • Compliant • Indian Government Approved
          </p>
        </footer>
      </div>
    </div>
  )
}

export default AadhaarAuthPage
