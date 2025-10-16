import React from "react"
import { cn } from "../../lib/utils"

const variantClasses = {
  primary:
    "bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 text-white shadow-[0_20px_50px_-20px_rgba(14,116,144,0.6)] hover:from-sky-400 hover:via-cyan-300 hover:to-emerald-300",
  outline:
    "border border-slate-300/60 text-slate-900 hover:border-slate-400 hover:bg-white/50 dark:border-slate-700/80 dark:text-slate-100 dark:hover:bg-white/5",
  ghost:
    "text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60",
  subtle:
    "bg-slate-100/70 text-slate-900 hover:bg-slate-200/60 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-700/60",
  link:
    "text-sky-600 underline-offset-4 hover:text-sky-700 hover:underline dark:text-sky-300 dark:hover:text-sky-200",
}

const sizeClasses = {
  default: "h-11 px-6 text-sm font-semibold",
  lg: "h-12 px-7 text-sm font-semibold",
  sm: "h-9 px-4 text-sm",
  icon: "h-11 w-11",
}

export const Button = React.forwardRef(
  ({ className, variant = "primary", size = "default", asChild = false, children, type, ...props }, ref) => {
    const isLinkVariant = variant === "link"
    const baseClasses = cn(
      "inline-flex items-center justify-center gap-2 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 dark:focus-visible:ring-sky-500",
      isLinkVariant ? "rounded-none px-0 py-0" : "rounded-full",
      variantClasses[variant],
      isLinkVariant ? "h-auto text-sm font-semibold" : sizeClasses[size],
      className
    )

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ref,
        className: cn(baseClasses, children.props.className),
        ...props,
      })
    }

    return (
      <button ref={ref} className={baseClasses} type={type ?? "button"} {...props}>
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"
