import { useCallback, useMemo, useState } from "react"

import { useAuth } from "../contexts/AuthContext"

export const useStatementUpload = ({ onSuccess } = {}) => {
  const { fetchWithAuth, API_BASE } = useAuth()
  const [uploadStatus, setUploadStatus] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [notification, setNotification] = useState(null)

  const notificationSound = useMemo(() => {
    return typeof Audio !== "undefined"
      ? new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=")
      : null
  }, [])

  const dismissNotification = useCallback(() => setNotification(null), [])

  const handleUpload = useCallback(
    async (fileOrList) => {
      const FileCtor = typeof File !== "undefined" ? File : null
      const file = FileCtor && fileOrList instanceof FileCtor ? fileOrList : fileOrList?.[0]
      if (!file) {
        return null
      }

      setUploadStatus("Uploading statements…")
      setUploadError(null)
      setIsUploading(true)

      try {
        const formData = new FormData()
        formData.append("csvFile", file)

        const response = await fetchWithAuth(`${API_BASE}/data/ingest/csv`, {
          method: "POST",
          body: formData,
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok || payload.status !== "success") {
          throw new Error(payload?.message || "Upload failed")
        }

        const total = payload?.data?.totalTransactions ?? 0
        const processed = payload?.data?.processed ?? 0
        setUploadStatus(`Processed ${total} transactions`)
        setNotification({
          variant: "success",
          title: "Transactions enriched",
          message: `Gemini processed ${total} rows and synced them to the workspace${processed && processed !== total ? ` (processed ${processed})` : ""}.`,
        })

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("dashboard:data-updated"))
        }

        if (notificationSound) {
          notificationSound.currentTime = 0
          notificationSound.play().catch(() => {})
        }

        if (typeof onSuccess === "function") {
          onSuccess(payload.data ?? null)
        }

        return payload.data ?? null
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed"
        setUploadError(message)
        setUploadStatus(null)
        setNotification({
          variant: "error",
          title: "Upload failed",
          message,
        })
        throw error
      } finally {
        setIsUploading(false)
      }
    },
    [API_BASE, fetchWithAuth, notificationSound, onSuccess]
  )

  return {
    isUploading,
    uploadStatus,
    uploadError,
    notification,
    handleUpload,
    dismissNotification,
  }
}

export default useStatementUpload
