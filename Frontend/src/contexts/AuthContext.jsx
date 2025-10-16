import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api"

const AuthContext = createContext(null)

const storageKeys = {
  access: "taxwise_token",
  refresh: "taxwise_refresh_token",
  user: "taxwise_user",
}

const readStoredAuth = () => {
  try {
    const accessToken = localStorage.getItem(storageKeys.access)
    const refreshToken = localStorage.getItem(storageKeys.refresh)
    const userRaw = localStorage.getItem(storageKeys.user)
    const user = userRaw ? JSON.parse(userRaw) : null
    if (!accessToken || !refreshToken) {
      return { accessToken: null, refreshToken: null, user: null }
    }
    return { accessToken, refreshToken, user }
  } catch (error) {
    console.error("Failed to read auth storage", error)
    return { accessToken: null, refreshToken: null, user: null }
  }
}

export const AuthProvider = ({ children }) => {
  const [{ accessToken, refreshToken, user }, setAuthState] = useState(readStoredAuth)
  const [status, setStatus] = useState(() => (accessToken ? "checking" : "guest"))
  const [isRefreshing, setIsRefreshing] = useState(false)

  const persistAuth = useCallback((next) => {
    if (next.accessToken && next.refreshToken) {
      localStorage.setItem(storageKeys.access, next.accessToken)
      localStorage.setItem(storageKeys.refresh, next.refreshToken)
      localStorage.setItem(storageKeys.user, JSON.stringify(next.user))
    } else {
      localStorage.removeItem(storageKeys.access)
      localStorage.removeItem(storageKeys.refresh)
      localStorage.removeItem(storageKeys.user)
    }
    setAuthState({
      accessToken: next.accessToken,
      refreshToken: next.refreshToken,
      user: next.user,
    })
  }, [])

  const signOut = useCallback(() => {
    persistAuth({ accessToken: null, refreshToken: null, user: null })
    setStatus("guest")
  }, [persistAuth])

  const refreshTokens = useCallback(async () => {
    if (!refreshToken) return null
    try {
      setIsRefreshing(true)
      const response = await fetch(`${API_BASE}/aadhaar-auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })
      if (!response.ok) {
        return null
      }
      const data = await response.json()
      if (data?.status !== "success") {
        return null
      }
      const nextTokens = {
        accessToken: data.data.tokens.accessToken,
        refreshToken: data.data.tokens.refreshToken,
      }
      const nextUser = data.data.user || user
      persistAuth({ ...nextTokens, user: nextUser })
      return nextTokens
    } catch (error) {
      console.error("Failed to refresh token", error)
      return null
    } finally {
      setIsRefreshing(false)
    }
  }, [refreshToken, persistAuth, user])

  const fetchWithAuth = useCallback(
    async (input, init = {}) => {
      const headers = new Headers(init.headers || {})
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`)
      }
      if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
        headers.set("Content-Type", "application/json")
      }
      const response = await fetch(input, { ...init, headers })
      if (response.status === 401 && refreshToken) {
        const refreshed = await refreshTokens()
        if (!refreshed) {
          signOut()
          return response
        }
        const retryHeaders = new Headers(init.headers || {})
        retryHeaders.set("Authorization", `Bearer ${refreshed.accessToken}`)
        if (!retryHeaders.has("Content-Type") && !(init.body instanceof FormData)) {
          retryHeaders.set("Content-Type", "application/json")
        }
        return fetch(input, { ...init, headers: retryHeaders })
      }
      return response
    },
    [accessToken, refreshToken, refreshTokens, signOut]
  )

  const loadCurrentUser = useCallback(async () => {
    if (!accessToken) {
      setStatus("guest")
      return
    }
    try {
      setStatus("checking")
      const response = await fetchWithAuth(`${API_BASE}/aadhaar-auth/me`)
      if (!response.ok) {
        if (response.status === 401) {
          const refreshed = await refreshTokens()
          if (!refreshed) {
            signOut()
            return
          }
          const retry = await fetchWithAuth(`${API_BASE}/aadhaar-auth/me`)
          if (!retry.ok) {
            signOut()
            return
          }
          const retryData = await retry.json()
          persistAuth({
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken ?? refreshToken,
            user: retryData.data.user,
          })
          setStatus("authenticated")
          return
        }
        signOut()
        return
      }
      const data = await response.json()
      persistAuth({ accessToken, refreshToken, user: data.data.user })
      setStatus("authenticated")
    } catch (error) {
      console.error("Failed to load current user", error)
      signOut()
    }
  }, [accessToken, refreshToken, fetchWithAuth, refreshTokens, persistAuth, signOut])

  useEffect(() => {
    if (status === "checking") {
      loadCurrentUser()
    }
  }, [status, loadCurrentUser])

  useEffect(() => {
    if (accessToken && status === "guest") {
      setStatus("checking")
    }
  }, [accessToken, status])

  const login = useCallback(
    ({ user: nextUser, tokens }) => {
      persistAuth({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: nextUser,
      })
      setStatus("authenticated")
    },
    [persistAuth]
  )

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      status,
      isRefreshing,
      login,
      signOut,
      fetchWithAuth,
      API_BASE,
    }),
    [user, accessToken, refreshToken, status, isRefreshing, login, signOut, fetchWithAuth]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export default AuthContext
