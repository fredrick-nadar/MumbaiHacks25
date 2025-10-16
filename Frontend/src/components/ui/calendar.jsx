import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "../../lib/utils"

import "react-day-picker/dist/style.css"

const iconClass = "h-4 w-4"

const components = {
  IconLeft: () => <ChevronLeft className={iconClass} />,
  IconRight: () => <ChevronRight className={iconClass} />,
}

export const Calendar = React.forwardRef(function Calendar(
  { className, classNames, ...props },
  ref
) {
  return (
    <DayPicker
      ref={ref}
      showOutsideDays
      fixedWeeks
      components={components}
      className={cn("p-2", className)}
      classNames={{
        months: "flex flex-col space-y-3",
        month: "space-y-3",
        caption: "flex justify-between px-2 text-sm font-medium text-slate-600 dark:text-slate-300",
        caption_label: "",
        nav: "flex items-center",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "w-9 text-xs font-semibold uppercase tracking-[0.26em] text-slate-400 dark:text-slate-500",
        row: "flex w-full mt-2",
        cell: "relative h-9 w-9 text-center text-[13px]",
        day: cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-slate-600 transition-colors hover:bg-sky-500/10 hover:text-sky-600 focus:outline-none dark:text-slate-300 dark:hover:bg-sky-500/15 dark:hover:text-sky-200",
          "aria-selected:bg-sky-500 aria-selected:text-white dark:aria-selected:bg-sky-500/80"
        ),
        day_selected: "",
        day_outside: "text-slate-300 opacity-60 dark:text-slate-600",
        day_today: "border border-sky-400/60 text-sky-600 dark:border-sky-500/60 dark:text-sky-200",
        day_disabled: "opacity-30",
        ...classNames,
      }}
      {...props}
    />
  )
})

