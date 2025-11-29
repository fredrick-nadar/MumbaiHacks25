'use client'

import { useState, useEffect, useCallback, useMemo } from "react"

import { useAuth } from "../contexts/AuthContext"

const createFetcher = (fetchWithAuth, API_BASE, path, { skip } = {}) => {
  const fetchData = async (signal, options = {}) => {
    if (skip) return null
    const response = await fetchWithAuth(`${API_BASE}${path}`, { signal, ...options })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      const message = payload?.message || `Request failed with status ${response.status}`
      throw new Error(message)
    }
    return response.json()
  }
  return fetchData
}

const REFRESH_EVENT = "dashboard:data-updated"

const useApiResource = (path, { skip = false, method = "GET", body } = {}) => {
  const { fetchWithAuth, API_BASE, status } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)

  const serializedBody = useMemo(() => {
    if (!body || typeof body === "string") return body ?? null
    try {
      return JSON.stringify(body)
    } catch {
      return null
    }
  }, [body])

  useEffect(() => {
    if (skip || status !== "authenticated") return
    const controller = new AbortController()
    const fetchData = createFetcher(fetchWithAuth, API_BASE, path, { skip })

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const payload = await fetchData(controller.signal, {
          method,
          body: serializedBody ?? undefined,
        })
        setData(payload?.data ?? payload)
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err)
        }
      } finally {
        setLoading(false)
      }
    }

    run()

    return () => controller.abort()
  }, [API_BASE, fetchWithAuth, method, path, skip, status, serializedBody, reloadToken])

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return undefined
    const handler = () => refresh()
    window.addEventListener(REFRESH_EVENT, handler)
    return () => window.removeEventListener(REFRESH_EVENT, handler)
  }, [refresh])

  return { data, loading, error, refresh, refetch: refresh }
}

export const useDashboardSummary = (options = {}) =>
  useApiResource("/dashboard/summary", options)

export const useDashboardTrends = (options = {}) => {
  const { period = 6 } = options
  return useApiResource(`/dashboard/trends?period=${period}`, options)
}

export const useTransactionsList = (params = {}, options = {}) => {
  const searchParams = new URLSearchParams({
    limit: params.limit?.toString() ?? "20",
    page: params.page?.toString() ?? "1",
  })

  if (params.type) searchParams.append("type", params.type)
  if (params.category) searchParams.append("category", params.category)
  if (params.startDate) searchParams.append("startDate", params.startDate)
  if (params.endDate) searchParams.append("endDate", params.endDate)
  if (params.search) searchParams.append("search", params.search)
  
  // Add refresh key to force refetch when it changes
  if (params._refreshKey !== undefined) {
    searchParams.append("_t", params._refreshKey.toString())
  }

  return useApiResource(`/transactions?${searchParams.toString()}`, options)
}

export const useTransactionsSummary = (period = 90, options = {}) =>
  useApiResource(`/transactions/summary?period=${period}`, options)

export const useCreditHealth = (options = {}) =>
  useApiResource(`/credit/health`, options)

export const useTaxSimulation = (options = {}) =>
  useApiResource(`/tax/simulate`, options)

export default {
  useDashboardSummary,
  useDashboardTrends,
  useTransactionsList,
  useTransactionsSummary,
  useCreditHealth,
  useTaxSimulation,
}
