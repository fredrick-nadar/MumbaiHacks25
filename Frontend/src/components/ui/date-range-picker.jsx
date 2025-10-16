import React, { useMemo } from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format, parseISO } from "date-fns"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

const toDate = (value) => {
  if (!value) return undefined
  if (value instanceof Date) return value
  try {
    const parsed = parseISO(value)
    return Number.isNaN(parsed.valueOf()) ? undefined : parsed
  } catch {
    return undefined
  }
}

const formatRangeLabel = (from, to) => {
  if (!from && !to) return null
  if (from && to) {
    return `${format(from, 'dd MMM yyyy')} – ${format(to, 'dd MMM yyyy')}`
  }
  if (from) {
    return `${format(from, 'dd MMM yyyy')}`
  }
  return `${format(to, 'dd MMM yyyy')}`
}

export const DateRangePicker = ({
  start,
  end,
  onChange,
  placeholder = "Select date range",
  disabled,
  className,
}) => {
  const selectedRange = useMemo(() => {
    const from = toDate(start)
    const to = toDate(end)
    if (!from && !to) return undefined
    return { from, to }
  }, [start, end])

  const label = useMemo(() => {
    if (!selectedRange) return null
    return formatRangeLabel(selectedRange.from, selectedRange.to)
  }, [selectedRange])

  const handleSelect = (range) => {
    if (!range || (!range.from && !range.to)) {
      onChange?.({ start: "", end: "" })
      return
    }
    const startValue = range.from ? format(range.from, 'yyyy-MM-dd') : ""
    const endValue = range.to ? format(range.to, 'yyyy-MM-dd') : ""
    onChange?.({ start: startValue, end: endValue })
  }

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
          <span className="truncate">{label || placeholder}</span>
          <CalendarIcon className="h-4 w-4 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={selectedRange}
          onSelect={handleSelect}
          defaultMonth={selectedRange?.from}
          initialFocus
        />
        <div className="mt-3 flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange?.({ start: "", end: "" })}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default DateRangePicker
