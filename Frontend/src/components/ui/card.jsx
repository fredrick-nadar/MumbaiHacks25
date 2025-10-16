import React from "react"
import { cn } from "../../lib/utils"

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative rounded-3xl border border-slate-200/70 bg-white/80 text-slate-900 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.6)] transition-colors dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-100",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-2.5 p-6", className)} {...props} />
)

const CardTitle = ({ className, ...props }) => (
  <h3 className={cn("text-lg font-semibold leading-snug tracking-tight", className)} {...props} />
)

const CardDescription = ({ className, ...props }) => (
  <p className={cn("text-sm text-slate-600 dark:text-slate-300", className)} {...props} />
)

const CardContent = ({ className, ...props }) => (
  <div className={cn("p-6 pt-0", className)} {...props} />
)

const CardFooter = ({ className, ...props }) => (
  <div className={cn("flex items-center p-6 pt-0", className)} {...props} />
)

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
