'use client'
/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useContext, useEffect, useMemo, useState } from "react"

import { BRANDING_STORAGE_KEY, defaultBranding } from "../config/branding"

const BrandingContext = createContext({
  branding: defaultBranding,
  updateBranding: () => {},
  resetBranding: () => {},
})

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState(defaultBranding)
  const [initialised, setInitialised] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = window.localStorage.getItem(BRANDING_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setBranding((prev) => ({ ...prev, ...parsed }))
      }
    } catch (error) {
      console.warn("Failed to load branding settings", error)
    } finally {
      setInitialised(true)
    }
  }, [])

  useEffect(() => {
    if (!initialised || typeof window === "undefined") return
    try {
      window.localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(branding))
    } catch (error) {
      console.warn("Failed to persist branding settings", error)
    }
  }, [branding, initialised])

  const updateBranding = (nextBranding) => {
    setBranding((prev) => ({ ...prev, ...nextBranding }))
  }

  const resetBranding = () => setBranding(defaultBranding)

  const value = useMemo(
    () => ({ branding, updateBranding, resetBranding }),
    [branding]
  )

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}

export const useBranding = () => useContext(BrandingContext)

export default BrandingContext
