'use client'

import React from "react"
import {
  AlertCircle as AlertCircleIcon,
  FileArchiveIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FileUpIcon,
  HeadphonesIcon,
  ImageIcon,
  VideoIcon,
  XIcon,
} from "lucide-react"

import { formatBytes, useFileUpload } from "../../hooks/useFileUpload"
import { Button } from "../ui/button"

const getFileIcon = (file) => {
  const target = file.file ?? file
  const fileType = target?.type || ""
  const fileName = target?.name || ""

  if (
    fileType.includes("pdf") ||
    fileName.endsWith(".pdf") ||
    fileType.includes("word") ||
    fileName.endsWith(".doc") ||
    fileName.endsWith(".docx")
  ) {
    return <FileTextIcon className="h-4 w-4 opacity-60" />
  }
  if (
    fileType.includes("zip") ||
    fileType.includes("archive") ||
    fileName.endsWith(".zip") ||
    fileName.endsWith(".rar")
  ) {
    return <FileArchiveIcon className="h-4 w-4 opacity-60" />
  }
  if (
    fileType.includes("excel") ||
    fileName.endsWith(".xls") ||
    fileName.endsWith(".xlsx")
  ) {
    return <FileSpreadsheetIcon className="h-4 w-4 opacity-60" />
  }
  if (fileType.includes("video/")) {
    return <VideoIcon className="h-4 w-4 opacity-60" />
  }
  if (fileType.includes("audio/")) {
    return <HeadphonesIcon className="h-4 w-4 opacity-60" />
  }
  if (fileType.startsWith("image/")) {
    return <ImageIcon className="h-4 w-4 opacity-60" />
  }
  return <FileIcon className="h-4 w-4 opacity-60" />
}

const FileUploader = ({
  maxSize = 100 * 1024 * 1024,
  maxFiles = 10,
  initial = [],
  accept = '.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf',
  onSubmit,
}) => {
  const [state, controls] = useFileUpload({
    multiple: true,
    maxFiles,
    maxSize,
    accept,
    initialFiles: initial,
  })

  const handleSubmit = () => {
    if (!onSubmit) return
    const payload = state.files.map((entry) => entry.file)
    onSubmit(payload)
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        onClick={controls.openFileDialog}
        onDragEnter={controls.handleDragEnter}
        onDragLeave={controls.handleDragLeave}
        onDragOver={controls.handleDragOver}
        onDrop={controls.handleDrop}
        data-dragging={state.isDragging || undefined}
        className="border-input hover:bg-accent/50 data-[dragging=true]:bg-accent/50 has-[input:focus]:border-ring has-[input:focus]:ring-ring/50 flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed p-6 transition-colors has-disabled:pointer-events-none has-disabled:opacity-50 has-[input:focus]:ring-[3px]"
      >
        <input {...controls.getInputProps()} className="sr-only" aria-label="Upload files" />
        <div className="flex flex-col items-center justify-center text-center">
          <div className="bg-background mb-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border" aria-hidden="true">
            <FileUpIcon className="h-4 w-4 opacity-60" />
          </div>
          <p className="mb-1.5 text-sm font-semibold">Upload filings or statements</p>
          <p className="text-muted-foreground mb-2 text-xs">Drag & drop or click to browse</p>
          <div className="text-muted-foreground/70 flex flex-wrap justify-center gap-1 text-xs">
            <span>CSV / XLSX / PDF</span>
            <span>∙</span>
            <span>Max {maxFiles} files</span>
            <span>∙</span>
            <span>Up to {formatBytes(maxSize)}</span>
          </div>
        </div>
      </div>

      {state.errors.length > 0 && (
        <div className="text-destructive flex items-center gap-1 text-xs" role="alert">
          <AlertCircleIcon className="h-3 w-3 shrink-0" />
          <span>{state.errors[0]}</span>
        </div>
      )}

      {state.files.length > 0 && (
        <div className="space-y-2">
          {state.files.map((entry) => {
            const target = entry.file instanceof File ? entry.file : entry.file
            const size = target instanceof File ? target.size : target.size
            const name = target instanceof File ? target.name : target.name

            return (
              <div key={entry.id} className="bg-background flex items-center justify-between gap-2 rounded-xl border p-2 pr-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex aspect-square h-10 w-10 shrink-0 items-center justify-center rounded border">
                    {getFileIcon(entry)}
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="truncate text-[13px] font-semibold">{name}</p>
                    <p className="text-muted-foreground text-xs">{formatBytes(size)}</p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground/80 hover:text-foreground -mr-2 h-8 w-8 hover:bg-transparent"
                  onClick={() => controls.removeFile(entry.id)}
                  aria-label="Remove file"
                >
                  <XIcon className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            )
          })}

          <div className="flex items-center justify-between gap-2">
            <Button size="sm" variant="outline" onClick={controls.clearFiles}>
              Remove all files
            </Button>
            {onSubmit && (
              <Button size="sm" onClick={handleSubmit}>
                Upload files
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUploader
