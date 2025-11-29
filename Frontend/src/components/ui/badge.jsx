import { cn } from "../../lib/utils"

const badgeVariants = {
  default: "bg-slate-900 text-white hover:bg-slate-900/80 dark:bg-slate-50 dark:text-slate-900",
  secondary: "bg-slate-100 text-slate-900 hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-50",
  destructive: "bg-red-500 text-white hover:bg-red-500/90 dark:bg-red-900 dark:text-red-50",
  outline: "border border-slate-200 bg-transparent text-slate-900 dark:border-slate-800 dark:text-slate-50",
  success: "bg-green-500 text-white hover:bg-green-500/90 dark:bg-green-900 dark:text-green-50",
  warning: "bg-yellow-500 text-white hover:bg-yellow-500/90 dark:bg-yellow-900 dark:text-yellow-50",
}

export const Badge = ({ className, variant = "default", ...props }) => {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  )
}
