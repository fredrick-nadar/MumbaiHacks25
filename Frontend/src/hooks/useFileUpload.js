'use client'

import { useCallback, useMemo, useRef, useState } from "react"

import { formatBytes } from "../lib/format-bytes"

const createFileEntry = (file) => ({
  id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  file,
})

export const useFileUpload = ({ multiple = true, maxFiles = 10, maxSize = 10 * 1024 * 1024, accept = '', initialFiles = [] } = {}) => {
  const inputRef = useRef(null)
  const [files, setFiles] = useState(() => initialFiles.map((file) => ({
    id: file.id || `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
  })))
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState([])

  const validate = useCallback((incoming) => {
    const issues = []
    const nextFiles = [...files]

    incoming.forEach((file) => {
      if (!multiple && nextFiles.length >= 1) {
        issues.push("Only one file allowed")
        return
      }
      if (nextFiles.length >= maxFiles) {
        issues.push(`Maximum ${maxFiles} files allowed`)
        return
      }
      const size = file.size ?? file.file?.size
      if (size && size > maxSize) {
        issues.push(`${file.name || file.file?.name} exceeds ${formatBytes(maxSize)}`)
        return
      }
      nextFiles.push(createFileEntry(file))
    })

    return { issues, nextFiles }
  }, [files, maxFiles, maxSize, multiple])

  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList || [])
    const { issues, nextFiles } = validate(incoming)
    if (issues.length) {
      setErrors(issues)
    } else {
      setErrors([])
    }
    setFiles(nextFiles)
  }, [validate])

  const removeFile = useCallback((id) => {
    setFiles((prev) => prev.filter((file) => file.id !== id))
  }, [])

  const clearFiles = useCallback(() => {
    setFiles([])
  }, [])

  const openFileDialog = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const getInputProps = useCallback(() => ({
    type: "file",
    ref: inputRef,
    multiple,
    accept,
    onChange: (event) => {
      addFiles(event.target.files)
      event.target.value = ""
    },
  }), [accept, addFiles, multiple])

  const handleDragEnter = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragOver = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
    if (event.dataTransfer?.files?.length) {
      addFiles(event.dataTransfer.files)
    }
  }, [addFiles])

  const state = useMemo(() => ({ files, isDragging, errors }), [errors, files, isDragging])
  const handlers = useMemo(() => ({
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    openFileDialog,
    removeFile,
    clearFiles,
    getInputProps,
  }), [clearFiles, getInputProps, handleDragEnter, handleDragLeave, handleDragOver, handleDrop, openFileDialog, removeFile])

  return [state, handlers]
}

export { formatBytes, createFileEntry }
