'use client'

import React from "react"
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react"

import { cn } from "../../lib/utils"

const variantStyles = {
  success: {
    border: "border-emerald-500/30",
    background: "bg-emerald-500/10",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  },
  error: {
    border: "border-rose-500/30",
    background: "bg-rose-500/10",
    icon: <CircleAlert className="h-4 w-4 text-rose-500" />,
  },
  info: {
    border: "border-sky-500/30",
    background: "bg-sky-500/10",
    icon: <Info className="h-4 w-4 text-sky-500" />,
  },
}

const NotificationCard = ({
  variant = "info",
  title,
  message,
  onClose,
  className,
}) => {
  const styles = variantStyles[variant] || variantStyles.info

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur",
        styles.border,
        styles.background,
        className
      )}
    >
      <div className="mt-1">{styles.icon}</div>
      <div className="flex-1 space-y-1">
        {title && <p className="font-semibold text-slate-900 dark:text-white">{title}</p>}
        {message && <p className="text-xs text-slate-600 dark:text-slate-300">{message}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export default NotificationCard
