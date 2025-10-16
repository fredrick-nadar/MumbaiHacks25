import React, { useMemo } from "react"
import { CalendarIcon } from "lucide-react"
import { endOfDay, format, isAfter, isBefore, parseISO, startOfDay } from "date-fns"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

const formatDateLabel = (value) => {
  try {
    const date = typeof value === "string" ? parseISO(value) : value
    if (!date || Number.isNaN(date.valueOf())) return null
    return format(date, "PPP")
  } catch {
    return null
  }
}

export const DatePicker = ({ value, onChange, placeholder = "Pick a date", disabled, className, minDate, maxDate, disableDate }) => {
  const selectedDate = useMemo(() => {
    if (!value) return undefined
    if (value instanceof Date) return value
    try {
      const parsed = parseISO(value)
      if (Number.isNaN(parsed.valueOf())) return undefined
      return parsed
    } catch {
      return undefined
    }
  }, [value])

  const minBoundary = useMemo(() => (minDate ? startOfDay(minDate) : null), [minDate])
  const maxBoundary = useMemo(() => (maxDate ? endOfDay(maxDate) : null), [maxDate])
  const label = selectedDate ? formatDateLabel(selectedDate) : null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between rounded-2xl border-white/30 bg-white/70 px-3 py-2 text-left text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-sky-400/60 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400/60 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-sky-500/60 dark:hover:text-sky-200",
            !label && "text-slate-400 dark:text-slate-500",
            className
          )}
        >
          <span className="truncate">
            {label || placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) {
              onChange?.("")
              return
            }
            const isoString = format(date, "yyyy-MM-dd")
            onChange?.(isoString)
          }}
          disabled={(date) => {
            if (!date) return true
            if (disableDate?.(date)) return true
            if (minBoundary && isBefore(date, minBoundary)) return true
            if (maxBoundary && isAfter(date, maxBoundary)) return true
            return false
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export default DatePicker
