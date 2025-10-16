'use client'

import React, { useState } from "react"
import { ArrowLeft, BadgeCheck, Fingerprint, RefreshCw } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import AadhaarVerification from "../../components/auth/AadhaarVerification"
import AadhaarReview from "../../components/auth/AadhaarReview"

const DashboardKycRefresh = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState("intro")
  const [verificationData, setVerificationData] = useState(null)
  const [completionData, setCompletionData] = useState(null)

  const handleStart = () => {
    setStep("verify")
    setVerificationData(null)
    setCompletionData(null)
  }

  const handleVerificationComplete = (data) => {
    setVerificationData(data)
    setStep("review")
  }

  const handleKycComplete = (data) => {
    setCompletionData(data)
    setStep("completed")
  }

  const renderIntro = () => (
    <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_70px_-38px_rgba(15,23,42,0.68)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 via-cyan-400/20 to-emerald-400/20">
          <Fingerprint className="h-8 w-8 text-sky-500" />
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Refresh Aadhaar KYC
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Re-run Aadhaar verification to keep your compliance records current. We validate against UIDAI-approved QR and XML formats and refresh encrypted identity keys for your workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 rounded-3xl border border-white/20 bg-white/75 p-5 text-left text-sm shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
          {["Scan the QR on the back of your Aadhaar card or upload XML from DigiLocker.", "Accept the refreshed hashes so we can rotate login credentials.", "Return to your profile to continue working with updated identity proofs."].map((item, index) => (
            <div key={item} className="flex items-start gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-sky-500/15 text-xs font-semibold text-sky-600 dark:text-sky-200">
                {index + 1}
              </span>
              <p className="text-slate-600 dark:text-slate-300">{item}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            onClick={handleStart}
            className="rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-6 text-sm font-semibold text-white shadow-[0_20px_45px_-28px_rgba(14,165,233,0.85)]"
          >
            Start re-verification
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-sm font-semibold"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderVerification = () => (
    <div className="flex justify-center">
      <AadhaarVerification onVerificationComplete={handleVerificationComplete} />
    </div>
  )

  const renderReview = () => (
    <div className="flex justify-center">
      <AadhaarReview verificationData={verificationData} onComplete={handleKycComplete} />
    </div>
  )

  const renderCompleted = () => (
    <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_70px_-38px_rgba(15,23,42,0.68)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 via-green-400/20 to-teal-400/20">
          <BadgeCheck className="h-8 w-8 text-emerald-500" />
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Aadhaar credentials refreshed
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Your workspace identity keys have been rotated. A confirmation email has been sent to the account owner.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-3xl border border-white/20 bg-white/80 p-5 text-sm shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            Verification artefacts
          </p>
          <dl className="mt-3 grid gap-3 text-slate-600 dark:text-slate-300">
            <div className="flex flex-col gap-1 rounded-2xl border border-slate-200/60 bg-slate-50/50 p-3 dark:border-slate-700/60 dark:bg-slate-900/60">
              <dt className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Session ID</dt>
              <dd className="font-mono text-sm text-slate-800 dark:text-slate-100">{completionData?.sessionId ?? "–"}</dd>
            </div>
            <div className="flex flex-col gap-1 rounded-2xl border border-slate-200/60 bg-slate-50/50 p-3 dark:border-slate-700/60 dark:bg-slate-900/60">
              <dt className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Verification mode</dt>
              <dd className="text-sm font-semibold text-slate-800 dark:text-slate-100">{completionData?.mode === "xml" ? "XML upload" : "QR scan"}</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            className="rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-6 text-sm font-semibold text-white shadow-[0_20px_45px_-28px_rgba(14,165,233,0.85)]"
            onClick={() => navigate("/dashboard/profile")}
          >
            Return to profile
          </Button>
          <Button
            variant="outline"
            onClick={handleStart}
            className="border-white/30 bg-white/70 text-sm font-semibold dark:border-slate-700/60 dark:bg-slate-900/70"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Run again
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const stages = {
    intro: renderIntro,
    verify: renderVerification,
    review: renderReview,
    completed: renderCompleted,
  }

  const StageComponent = stages[step] ?? renderIntro

  return <div className="space-y-6">{StageComponent()}</div>
}

export default DashboardKycRefresh
