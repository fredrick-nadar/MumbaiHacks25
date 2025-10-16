import React from "react"
import { Moon, Sun } from "lucide-react"

import { cn } from "../lib/utils"
import { Button } from "./ui/button"

export const ThemeToggle = ({ theme, onToggle }) => {
  const isDark = theme === "dark"

  return (
    <Button
      type="button"
      variant="subtle"
      size="icon"
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      onClick={onToggle}
      className="relative overflow-hidden border border-slate-200/70 bg-white/80 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/60"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-orange-200/70 via-yellow-100/60 to-amber-200/40 transition-opacity duration-500 dark:from-blue-900/60 dark:via-sky-800/50 dark:to-indigo-800/40" />
      <div
        className={cn(
          "relative flex items-center justify-center text-slate-800 transition-transform duration-500 ease-out dark:text-sky-100",
          isDark ? "rotate-[45deg] scale-[0.92]" : "-rotate-[45deg] scale-[1.05]"
        )}
      >
        {isDark ? (
          <Moon className="h-5 w-5 transition-transform duration-500 ease-out" strokeWidth={1.5} />
        ) : (
          <Sun className="h-5 w-5 transition-transform duration-500 ease-out" strokeWidth={1.5} />
        )}
      </div>
    </Button>
  )
}
