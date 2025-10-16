export const CA_SESSIONS_STORAGE_KEY = "acternity.caSessions"

export const readStoredCaSessions = () => {
  if (typeof window === "undefined") return []
  try {
    const stored = window.localStorage.getItem(CA_SESSIONS_STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn("Failed to read CA sessions from storage", error)
    return []
  }
}

export const persistCaSessions = (sessions) => {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(CA_SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
  } catch (error) {
    console.warn("Failed to persist CA sessions", error)
  }
}
