'use client'

import React, { useMemo } from "react"
import { ArrowLeft, CheckCircle2, FileText, ShieldCheck, Sparkles } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"

const runbookLibrary = {
  "partner-approvals": {
    title: "Partner approvals",
    description: "Ensure every filing passes maker-checker before submission.",
    owner: "Risk & Compliance",
    sla: "Activation within 2 hours",
    summary: [
      "Set approval policies for filings above configured thresholds.",
      "Notify reviewers via email and workspace alerts for pending approvals.",
      "Escalate breached SLA items to the principal partner automatically.",
    ],
    steps: [
      "Open Workspace Settings → Compliance Controls → Approvals.",
      "Select threshold type (invoice amount or client class) and add reviewer groups.",
      "Toggle \"Require digital signature\" if you need DSC before submission.",
      "Save policy and trigger a dry run on a recent filing to validate routing.",
    ],
    controls: ["Approval thresholds", "Reviewer roster", "Escalation rules"],
  },
  "api-key-rotation": {
    title: "API key rotation",
    description: "Rotate internal and client-facing API keys every 30 days.",
    owner: "Platform Engineering",
    sla: "Rotation completes in 15 minutes",
    summary: [
      "Revoke active keys, generate new credentials, and notify integrations.",
      "Download backup JSON for audit storage with one-time visibility.",
    ],
    steps: [
      "Navigate to Developer Console → Credentials.",
      "Click Rotate on the key you wish to refresh.",
      "Confirm webhook delivery endpoints are healthy before rotation.",
      "Distribute new key securely; revoke prior key once confirmed by integrators.",
    ],
    controls: ["Credential vault", "Webhook validation", "Audit trail"],
  },
  "bureau-webhook": {
    title: "Bureau webhook",
    description: "Enable signed callbacks for bureau breach alerts.",
    owner: "Security Engineering",
    sla: "Webhook live in 1 business day",
    summary: [
      "Create destination endpoint with TLS 1.2+, token protected.",
      "Register signing key fingerprint with BitNBuild.",
      "Test delivery using sandbox payload to confirm signature validation.",
    ],
    steps: [
      "Create a POST endpoint that accepts JSON payloads.",
      "Copy the verification token and add it as X-BNB-Signature header checker.",
      "Use the sandbox trigger to push a sample alert and log the attempt.",
      "Approve the webhook once monitoring dashboards confirm receipt.",
    ],
    controls: ["HMAC signatures", "Replay protection", "Audit log stream"],
  },
  "client-mfa": {
    title: "Client MFA enforcement",
    description: "Mandate OTP or authenticator approval for every client login.",
    owner: "Security Engineering",
    sla: "Policy enforcement in 30 minutes",
    summary: [
      "Select the second factor (SMS OTP, authenticator, or FIDO key).",
      "Safelist internal IP ranges if required for back-office operators.",
    ],
    steps: [
      "Go to Security Centre → Authentication policies.",
      "Enable MFA and choose enforcement scope (all users or high-risk only).",
      "Sync user directory to prompt enrolment on next login.",
      "Download the enrolment report to track users who haven't completed setup.",
    ],
    controls: ["Authenticator app", "SMS gateway", "Directory sync"],
  },
  "audit-log": {
    title: "Audit log streaming",
    description: "Stream sensitive workspace events to a tamper-proof ledger.",
    owner: "Platform Engineering",
    sla: "Stream live within 4 hours",
    summary: [
      "Provision a destination (S3, GCS, or syslog collector).",
      "Exchange public keys for envelope encryption of payloads.",
    ],
    steps: [
      "Create a destination connector under Security Centre → Audit.",
      "Upload the collector public key and choose retention policy.",
      "Test delivery with sample events and verify checksums.",
      "Approve live stream and save reference ID for audits.",
    ],
    controls: ["Immutable ledger", "Checksum validator", "Retention policies"],
  },
  "compliance-pack": {
    title: "Compliance pack readiness",
    description: "Download SOC/ISO artefacts for regulator submissions.",
    owner: "Compliance Desk",
    sla: "Pack ready instantly",
    summary: [
      "Choose the required frameworks and export zipped documentation.",
      "Sync evidence folders from your document control system.",
    ],
    steps: [
      "Visit Compliance Packs under Security Centre.",
      "Select frameworks (SOC 2, ISO 27001, GDPR) and requested period.",
      "Attach evidence links or upload latest signed certificates.",
      "Generate export and share via secure link with regulators.",
    ],
    controls: ["Framework selector", "Evidence locker", "Download history"],
  },
}

const DashboardRunbook = () => {
  const navigate = useNavigate()
  const { runbookId } = useParams()

  const runbook = useMemo(() => runbookLibrary[runbookId] ?? null, [runbookId])

  if (!runbook) {
    return (
      <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_70px_-38px_rgba(15,23,42,0.68)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
        <CardHeader className="space-y-3">
          <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Runbook not found</CardTitle>
          <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
            We could not locate documentation for this control. Please return to the Security Centre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate(-1)} className="rounded-full bg-slate-900 px-5 text-sm font-semibold text-white dark:bg-white/90 dark:text-slate-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="text-sm font-semibold"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
          <Sparkles className="h-4 w-4 text-sky-500" />
          Security runbook
        </div>
      </div>
      <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_70px_-38px_rgba(15,23,42,0.68)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
        <CardHeader className="space-y-3">
          <CardTitle className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            <ShieldCheck className="h-6 w-6 text-sky-500" />
            {runbook.title}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {runbook.description}
          </CardDescription>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 dark:border-slate-700/70 dark:bg-slate-900/70">
              Owner: <span className="font-semibold text-slate-600 dark:text-slate-200">{runbook.owner}</span>
            </span>
            <span className="rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 dark:border-slate-700/70 dark:bg-slate-900/70">
              SLA: <span className="font-semibold text-emerald-600 dark:text-emerald-300">{runbook.sla}</span>
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="grid gap-4 rounded-3xl border border-white/20 bg-white/80 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
              Why it matters
            </p>
            <ul className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {runbook.summary.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="grid gap-4 rounded-3xl border border-white/20 bg-white/80 p-6 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
              Implementation steps
            </p>
            <ol className="grid gap-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {runbook.steps.map((item, index) => (
                <li key={item} className="flex items-start gap-3 rounded-3xl border border-slate-200/60 bg-slate-50/60 p-4 dark:border-slate-700/60 dark:bg-slate-900/70">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-sm font-semibold text-sky-600 dark:text-sky-200">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </section>
          <section className="grid gap-3 rounded-3xl border border-white/20 bg-white/80 p-6 text-sm shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
              Controls affected
            </p>
            <div className="flex flex-wrap gap-2">
              {runbook.controls.map((control) => (
                <span
                  key={control}
                  className="rounded-full border border-slate-200/70 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-200"
                >
                  {control}
                </span>
              ))}
            </div>
          </section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              onClick={() => navigate("/dashboard/profile")}
              className="rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-6 text-sm font-semibold text-white shadow-[0_20px_45px_-28px_rgba(14,165,233,0.85)]"
            >
              Return to Security Centre
            </Button>
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-full border border-white/30 bg-white/70 text-xs font-semibold uppercase tracking-[0.28em] text-slate-600 hover:border-sky-400/40 hover:text-sky-600 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200"
            >
              <FileText className="h-4 w-4" />
              Export runbook
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardRunbook
