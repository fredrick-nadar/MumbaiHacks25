'use client'

import React, { useEffect, useMemo, useState } from "react"
import { Paintbrush, Palette, UploadCloud, Wand2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { cn } from "../../lib/utils"
import { defaultBranding } from "../../config/branding"
import { useBranding } from "../../contexts/BrandingContext"

const accentBg = (primary, accent) =>
  `linear-gradient(135deg, ${primary} 0%, ${accent} 48%, rgba(241,245,249,0.95) 100%)`

const colorSwatches = ["#0ea5e9", "#14b8a6", "#38bdf8", "#6366f1", "#f97316", "#22d3ee", "#f59e0b", "#ec4899"]

const DashboardBranding = () => {
  const { branding: activeBranding, updateBranding, resetBranding } = useBranding()
  const [branding, setBranding] = useState(activeBranding ?? defaultBranding)
  const [status, setStatus] = useState("idle")

  useEffect(() => {
    setBranding((prev) => ({ ...prev, ...(activeBranding ?? {}) }))
  }, [activeBranding])

  const previewStyle = useMemo(
    () => ({
      backgroundImage: accentBg(branding.primaryColor, branding.accentColor),
    }),
    [branding.primaryColor, branding.accentColor]
  )

  const handleChange = (event) => {
    const { name, value } = event.target
    setBranding((prev) => ({ ...prev, [name]: value }))
  }

  const handleQuickColor = (primary) => {
    setBranding((prev) => ({ ...prev, primaryColor: primary }))
  }

  const handleAccentPick = (accent) => {
    setBranding((prev) => ({ ...prev, accentColor: accent }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (status === "saving") return
    setStatus("saving")
    setTimeout(() => {
      updateBranding(branding)
      setStatus("saved")
      setTimeout(() => setStatus("idle"), 2500)
    }, 750)
  }

  const handleReset = () => {
    setBranding(defaultBranding)
    resetBranding()
    setStatus("saved")
    setTimeout(() => setStatus("idle"), 2500)
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[36px] border-white/10 bg-white/80 shadow-[0_26px_70px_-38px_rgba(15,23,42,0.68)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-white">
              <Palette className="h-5 w-5 text-sky-500" />
              Firm branding
            </CardTitle>
            <CardDescription className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Configure how clients experience your workspace
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={handleReset}
            disabled={status === "saving"}
            className="rounded-full border border-white/30 bg-white/70 px-4 text-xs font-semibold uppercase tracking-[0.28em] text-slate-600 shadow-sm transition hover:border-sky-400/40 hover:text-sky-600 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200"
          >
            Reset
          </Button>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)]">
          <form onSubmit={handleSubmit} className="grid gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                Identity
              </p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firmName">Firm name</Label>
                  <Input
                    id="firmName"
                    name="firmName"
                    value={branding.firmName}
                    onChange={handleChange}
                    placeholder="Your firm"
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    name="tagline"
                    value={branding.tagline}
                    onChange={handleChange}
                    placeholder="What do clients experience?"
                    className="rounded-2xl"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                Colour system
              </p>
              <div className="mt-3 grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <Paintbrush className="h-4 w-4 text-sky-500" />
                    Primary colour
                  </Label>
                  <Input
                    type="color"
                    name="primaryColor"
                    value={branding.primaryColor}
                    onChange={handleChange}
                    className="h-12 w-full cursor-pointer rounded-2xl border border-white/30 bg-white/70 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70"
                    aria-label="Pick primary brand colour"
                  />
                  <div className="flex flex-wrap gap-2">
                    {colorSwatches.map((swatch) => (
                      <button
                        key={`primary-${swatch}`}
                        type="button"
                        onClick={() => handleQuickColor(swatch)}
                        className={cn(
                          "h-10 w-10 rounded-xl border-2 transition",
                          branding.primaryColor === swatch
                            ? "border-slate-900 shadow-lg dark:border-white"
                            : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: swatch }}
                        aria-label={`Use ${swatch} as primary colour`}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <Wand2 className="h-4 w-4 text-emerald-500" />
                    Accent colour
                  </Label>
                  <Input
                    type="color"
                    name="accentColor"
                    value={branding.accentColor}
                    onChange={handleChange}
                    className="h-12 w-full cursor-pointer rounded-2xl border border-white/30 bg-white/70 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/70"
                    aria-label="Pick accent colour"
                  />
                  <div className="flex flex-wrap gap-2">
                    {colorSwatches.map((swatch) => (
                      <button
                        key={`accent-${swatch}`}
                        type="button"
                        onClick={() => handleAccentPick(swatch)}
                        className={cn(
                          "h-10 w-10 rounded-xl border-2 transition",
                          branding.accentColor === swatch
                            ? "border-slate-900 shadow-lg dark:border-white"
                            : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: swatch }}
                        aria-label={`Use ${swatch} as accent colour`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  name="logoUrl"
                  value={branding.logoUrl}
                  onChange={handleChange}
                  placeholder="https://cdn.yourdomain.com/logo.svg"
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faviconUrl">Favicon URL</Label>
                <Input
                  id="faviconUrl"
                  name="faviconUrl"
                  value={branding.faviconUrl}
                  onChange={handleChange}
                  placeholder="https://cdn.yourdomain.com/favicon.ico"
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="emailSignature">Email signature</Label>
                <textarea
                  id="emailSignature"
                  name="emailSignature"
                  value={branding.emailSignature}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-2xl border border-white/30 bg-white/70 p-3 text-sm shadow-sm focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-200/60 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200"
                  placeholder="How should your emails close?"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="invoiceNote">Invoice footer</Label>
                <textarea
                  id="invoiceNote"
                  name="invoiceNote"
                  value={branding.invoiceNote}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-2xl border border-white/30 bg-white/70 p-3 text-sm shadow-sm focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-200/60 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200"
                  placeholder="Shown on invoices and compliance PDFs"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                <p>Update logos via a CDN or internal asset library.</p>
                {status === "saved" && (
                  <p className="font-semibold text-emerald-600 dark:text-emerald-300">Branding applied across navigation, auth, and dashboard surfaces.</p>
                )}
                {status === "saving" && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Syncing palette across workspace…</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={status === "saving"}
                className="rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-6 text-sm font-semibold text-white shadow-[0_20px_45px_-28px_rgba(14,165,233,0.85)] disabled:opacity-75"
              >
                {status === "saving" ? "Saving…" : "Save branding"}
              </Button>
            </div>
          </form>

          <div className="space-y-4">
            <Card className="h-full rounded-3xl border-white/20 bg-white/80 shadow-[0_20px_55px_-30px_rgba(15,23,42,0.6)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
              <CardContent className="relative flex h-full flex-col justify-between gap-6 rounded-3xl p-6" style={previewStyle}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-sm font-semibold text-slate-800">
                      {branding.firmName
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((word) => word[0]?.toUpperCase() ?? "")
                        .join("")}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white/90">{branding.firmName}</p>
                      <p className="text-xs text-white/70">Client workspace preview</p>
                    </div>
                  </div>
                  <UploadCloud className="h-5 w-5 text-white/70" />
                </div>
                <div className="rounded-3xl border border-white/40 bg-white/80 p-5 text-sm text-slate-700 shadow-sm backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Workspace intro</p>
                  <p className="mt-3 text-lg font-semibold text-slate-900">{branding.tagline}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Email signature preview:
                    <span className="mt-1 block whitespace-pre-line rounded-2xl border border-white/60 bg-white/80 px-3 py-2 text-slate-600 shadow-sm">
                      {branding.emailSignature}
                    </span>
                  </p>
                </div>
                <div className="rounded-3xl border border-white/40 bg-white/85 p-4 text-xs text-slate-600 shadow-sm">
                  <p className="font-semibold text-slate-800">Invoice footer</p>
                  <p className="mt-2 leading-relaxed">{branding.invoiceNote}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardBranding
