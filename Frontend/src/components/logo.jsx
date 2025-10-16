'use client'

import React from "react"

import { cn } from "../lib/utils"
import logoMark from "../assets/branding/taxwise-logo.png"
import { useBranding } from "../contexts/BrandingContext"
import { defaultBranding } from "../config/branding"
import { AnimatePresence, motion } from "framer-motion"
const sizeStyles = {
  sm: {
    logo: "h-19",
    compactLogo: "h-16",
    name: "text-sm",
    tagline: "text-[11px]",
  },
  md: {
    logo: "h-16",
    compactLogo: "h-18",
    name: "text-base",
    tagline: "text-xs",
  },
  lg: {
    logo: "h-16",
    compactLogo: "h-16",
    name: "text-lg",
    tagline: "text-sm",
  },
}

const LogoBadge = ({
  className,
  compact = false,
  size = "md",
  align = "left",
  showTagline = true,
}) => {
  const { branding: activeBranding = defaultBranding } = useBranding()
  const styles = sizeStyles[size] || sizeStyles.md
  const logoClass = compact ? styles.compactLogo : styles.logo
  const alignment = align === "center" ? "justify-center text-center" : "text-left"
  const firmName = activeBranding?.firmName?.trim() || defaultBranding.firmName
  const taglineText = activeBranding?.tagline?.trim() || "Financial Intelligence Suite"

  return (
    <div className={cn("flex items-center overflow-clip", compact ? "gap-0" : "gap-0", alignment, className)}>
      <img
        src={logoMark}
        alt={`${firmName} logo`}
        className={cn("w-auto select-none", logoClass)}
        draggable={false}
      />
      {!compact && (
        <div className={cn("leading-tight", align === "center" ? "text-center" : "text-left")}>
          <p className={cn("font-semibold text-slate-900 dark:text-white", styles.name)}>{firmName}</p>
          <AnimatePresence >{showTagline && (
            <motion.p initial={{opacity:0}} animate={{opacity:[0,0.5,1], translateX:[-10,0], transition:{duration:0.2}}} className={cn("text-slate-500 whitespace-nowrap dark:text-slate-400", styles.tagline)}>{taglineText}</motion.p>
          )}</AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default LogoBadge
