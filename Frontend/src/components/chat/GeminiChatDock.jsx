'use client'

import React, { useEffect, useMemo, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Maximize2, MessageCircle, Minimize2, Send, Sparkles, Upload, X } from "lucide-react"

import { generateGeminiContent, isGeminiConfigured } from "../../services/geminiClient"
import { Button } from "../ui/button"
import { cn } from "../../lib/utils"
import { useStatementUpload } from "../../hooks/useStatementUpload"

const SYSTEM_PROMPT = `You are the TaxWise Copilot, a senior tax assistant who studies dashboard analytics, filings, and optimisation insights.
Respond in professional, friendly language. Format answers using GitHub-flavoured Markdown when it improves clarity (lists, tables, call-outs).
Reference any uploaded statements or simulations explicitly and highlight assumptions if data is missing. Always suggest next steps in TaxWise when relevant.`

const QUICK_PROMPTS = [
  {
    label: 'Summarise cash flow',
    prompt: 'Summarise my latest inflow versus outflow trends and call out any anomalies.',
  },
  {
    label: 'Regime advice',
    prompt: 'Based on the current tax simulation, which regime should I pick and why?',
  },
  {
    label: 'Improve filings',
    prompt: 'Give me three actions to improve filing velocity this month.',
  },
  {
    label: 'Spot deductions',
    prompt: 'List deduction sections where I still have headroom according to the TaxWise data.',
  },
]

const GeminiChatDock = () => {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const configured = useMemo(() => isGeminiConfigured(), [])
  const fileInputRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const {
    handleUpload: uploadStatement,
    isUploading,
    uploadStatus,
    uploadError,
  } = useStatementUpload()
  const [expanded, setExpanded] = useState(false)
  const [showPrompts, setShowPrompts] = useState(true)

  useEffect(() => {
    if (!scrollContainerRef.current) return
    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
  }, [messages, loading])

  const handleToggle = () => setOpen((prev) => !prev)

  const sendPrompt = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const nextMessages = [...messages, { role: 'user', text: trimmed }]
    setMessages(nextMessages)
    setInput("")

    if (!configured) {
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          text: 'Gemini API key missing. Add VITE_GEMINI_API_KEY to enable the TaxWise Copilot.',
        },
      ])
      return
    }

    try {
      setLoading(true)
      const reply = await generateGeminiContent({
        messages: nextMessages.map((msg) => ({ role: msg.role, text: msg.text })),
        systemInstruction: SYSTEM_PROMPT,
      })
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: reply || 'I could not generate a response right now. Please try again.',
        },
      ])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: error.message || 'Something went wrong while contacting Gemini.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (event) => {
    event?.preventDefault?.()
    sendPrompt(input)
  }

  const handleQuickPrompt = (prompt) => {
    if (loading) return
    setShowPrompts(false)
    sendPrompt(prompt)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileName = file.name
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', text: `Uploading **${fileName}** to TaxWise…` },
    ])

    try {
      const result = await uploadStatement(file)
      const total = result?.totalTransactions ?? result?.processed ?? null
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: total
            ? `Finished ingesting **${total}** rows from ${fileName}. Ask me what changed in your workspace.`
            : `Upload complete for ${fileName}. Re-run analytics and ask me follow-up questions.`,
        },
      ])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Upload failed: ${message}` },
      ])
    } finally {
      event.target.value = ""
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          className={cn(
            "pointer-events-auto max-h-[80vh] rounded-3xl border border-white/20 bg-white/95 p-4 shadow-[0_35px_60px_-25px_rgba(15,23,42,0.55)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/90",
            "flex flex-col overflow-hidden",
            expanded ? "w-[34rem]" : "w-80"
          )}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">TaxWise Copilot</p>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">AI workspace assistant</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setExpanded((prev) => !prev)}
                className="h-8 w-8"
                title={expanded ? "Reduce panel" : "Expand panel"}
              >
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={handleToggle}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mb-3 space-y-2">
            {showPrompts ? (
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((item) => (
                  <Button
                    key={item.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPrompt(item.prompt)}
                    disabled={loading}
                    className="pointer-events-auto rounded-full border-slate-200 bg-white/70 px-3 py-1 text-[11px] font-medium text-slate-600 hover:border-sky-300 hover:text-sky-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-sky-500"
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    {item.label}
                  </Button>
                ))}
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1 px-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 hover:text-sky-600 dark:text-slate-500 dark:hover:text-sky-300"
                onClick={() => setShowPrompts(true)}
              >
                <Sparkles className="h-3 w-3" />
                Show prompts
              </Button>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUploadClick}
                disabled={isUploading}
                className="rounded-full border-sky-300/70 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-600 hover:border-sky-400 hover:bg-sky-500/20 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-200"
              >
                <Upload className="mr-1 h-3.5 w-3.5" />
                {isUploading ? 'Uploading…' : 'Upload docs'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".csv,.pdf,.xlsx,.xls"
              />
            </div>
          </div>
          {(uploadStatus || uploadError) && (
            <div className="mb-2 space-y-1 text-[11px]">
              {uploadStatus && <p className="text-emerald-600 dark:text-emerald-300">{uploadStatus}</p>}
              {uploadError && <p className="text-rose-500">{uploadError}</p>}
            </div>
          )}
          <div
            ref={scrollContainerRef}
            className={cn(
              "mb-3 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-slate-50/60 p-3 text-sm text-slate-700 dark:bg-slate-900/60 dark:text-slate-200",
              expanded ? "max-h-[54vh]" : "h-64"
            )}
          >
            {messages.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ask about filings, category trends, or tax savings to get tailored guidance.
              </p>
            )}
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  'rounded-2xl px-3 py-2 text-sm shadow-sm',
                  message.role === 'user'
                    ? 'ml-auto max-w-[90%] bg-sky-500/10 text-sky-800 dark:bg-sky-500/20 dark:text-sky-100'
                    : 'mr-auto max-w-[95%] bg-white text-slate-700 dark:bg-slate-800/80 dark:text-slate-100'
                )}
              >
                {message.role === 'user' ? (
                  message.text
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="space-y-1 text-sm leading-relaxed [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_li]:ml-4 [&_li]:list-disc [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:pl-5 [&_a]:text-sky-600 [&_strong]:font-semibold dark:[&_code]:bg-slate-800/70 dark:[&_a]:text-sky-300"
                  >
                    {message.text}
                  </ReactMarkdown>
                )}
              </div>
            ))}
            {loading && (
              <div className="mr-auto inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm dark:bg-slate-800/80 dark:text-slate-300">
                <span className="h-2 w-2 animate-ping rounded-full bg-sky-500" />
                Thinking…
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 pt-1">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    handleSubmit()
                  }
                }}
                placeholder={configured ? 'Ask the Copilot about filings or tax insights…' : 'Add VITE_GEMINI_API_KEY to enable the Copilot'}
                disabled={loading}
                rows={Math.min(4, Math.max(2, input.split('\n').length))}
                className="flex-1 max-h-36 resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-right text-[10px] uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
              Enter to send · Shift+Enter for newline
            </p>
          </form>
        </div>
      )}
      <Button
        type="button"
        onClick={handleToggle}
        size="lg"
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-[0_25px_45px_-28px_rgba(14,165,233,0.85)]"
      >
        <MessageCircle className="h-4 w-4" />
        {open ? 'Close Copilot' : 'TaxWise Copilot'}
      </Button>
    </div>
  )
}

export default GeminiChatDock
