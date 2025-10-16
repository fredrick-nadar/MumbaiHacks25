'use client'

import React from "react"
import { FormProvider, useFormContext } from "react-hook-form"

import { cn } from "../../lib/utils"

const Form = ({ children, ...props }) => {
  return <FormProvider {...props}>{children}</FormProvider>
}

const FormField = ({ name, render }) => {
  const methods = useFormContext()
  const value = methods.watch(name)
  const field = {
    name,
    value,
    onChange: methods.register(name).onChange,
    onBlur: methods.register(name).onBlur,
    ref: methods.register(name).ref,
  }

  return render({ field })
}

const FormItem = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props} />
))
FormItem.displayName = "FormItem"

const FormLabel = ({ className, ...props }) => (
  <label className={cn("text-sm font-medium text-slate-600 dark:text-slate-300", className)} {...props} />
)

const FormControl = ({ className, ...props }) => (
  <div className={cn("space-y-1", className)} {...props} />
)

const FormDescription = ({ className, ...props }) => (
  <p className={cn("text-xs text-slate-500 dark:text-slate-400", className)} {...props} />
)

const FormMessage = ({ className, children, ...props }) => {
  if (!children) return null
  return (
    <p className={cn("text-xs text-rose-500", className)} {...props}>
      {children}
    </p>
  )
}

export { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage }
