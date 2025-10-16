import { useEffect, useMemo, useRef, useState } from "react"

import { useCreditHealth, useTransactionsSummary } from "./useDashboardApi"
import { generateGeminiContent, isGeminiConfigured, parseGeminiJson } from "../services/geminiClient"

const ADVISOR_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const advisorCache = new Map()

const buildAdvisorPrompt = (creditHealth, transactionsSummary) => {
  if (!creditHealth) return null

  const factors = creditHealth?.factors?.map((factor) => ({
    factor: factor.factor,
    impact: factor.impact,
    score: factor.score,
    status: factor.status,
  })) ?? []

  const creditDetails = creditHealth?.details ?? {}
  const utilisation = creditDetails?.creditUtilization ?? {}
  const paymentBehaviour = creditDetails?.paymentBehaviour ?? {}

  const payload = {
    profile: {
      estimatedScore: creditHealth?.estimatedScore ?? null,
      scoreRange: creditHealth?.scoreRange ?? null,
      lastUpdated: creditHealth?.lastUpdated ?? null,
      utilisationRatio: utilisation.utilizationRatio ?? creditHealth?.utilizationRatio ?? null,
      creditLimit: utilisation.totalCreditLimit ?? null,
      totalUtilised: utilisation.totalUtilized ?? null,
      onTimePayments: paymentBehaviour.onTimePayments ?? creditHealth?.onTimePayments ?? null,
      totalPayments: paymentBehaviour.totalPayments ?? creditHealth?.totalPayments ?? null,
      loans: creditHealth?.loans ?? null,
      creditCards: creditHealth?.creditCards ?? null,
    },
    factors,
    utilisation,
    paymentBehaviour,
    transactions: {
      period: transactionsSummary?.period ?? null,
      totalIncome: transactionsSummary?.totalIncome ?? null,
      totalExpenses: transactionsSummary?.totalExpenses ?? null,
      netFlow: transactionsSummary?.netFlow ?? null,
      categoryStats: (transactionsSummary?.categoryStats ?? []).slice(0, 6).map((entry) => ({
        category: entry._id,
        credit: entry.credit,
        debit: entry.debit,
        shareOfInflows: entry.shareOfInflows,
        shareOfOutflows: entry.shareOfOutflows,
      })),
    },
  }

  const promptPayload = JSON.stringify(payload, null, 2)

  return `You are a senior CIBIL score advisor helping a finance team interpret credit behaviour. Analyse the provided JSON (Indian context) and produce clear, actionable insights.

Return a JSON response with the structure:
{
  "headline": string,
  "scoreOutlook": string,
  "keyFactors": [{ "title": string, "impact": "positive" | "negative" | "neutral", "detail": string }],
  "recommendations": [{ "action": string, "expectedImpact": string, "timeframe": "immediate" | "30_days" | "90_days" }],
  "whatIfScenarios": [{ "scenario": string, "expectedScoreDelta": string, "steps": string }],
  "watchouts": [string]
}

Guidelines:
- Explain insights in plain language. Mention rupee values where useful.
- For scenarios, quantify potential score improvement (e.g., "+25 points").
- Use the utilisation and payment details to prioritise actions.
- If data is missing, acknowledge it instead of guessing.

Data:
${promptPayload}`
}

export const useCreditAdvisor = () => {
  const { data: creditHealth, loading: loadingCredit, error: creditError } = useCreditHealth()
  const { data: transactionsSummary, loading: loadingTransactions } = useTransactionsSummary(120)

  const [advisor, setAdvisor] = useState(null)
  const [loadingAdvisor, setLoadingAdvisor] = useState(false)
  const [error, setError] = useState(null)

  const prompt = useMemo(() => buildAdvisorPrompt(creditHealth, transactionsSummary), [creditHealth, transactionsSummary])
  const latestPromptRef = useRef(null)
  const latestAdvisorRef = useRef(null)

  useEffect(() => {
    if (!prompt || loadingCredit || loadingTransactions) {
      return
    }

    if (!isGeminiConfigured()) {
      setAdvisor(null)
      latestAdvisorRef.current = null
      setError(new Error("Gemini API key missing"))
      return
    }

    const cachedAdvisor = advisorCache.get(prompt)
    if (cachedAdvisor && Date.now() - cachedAdvisor.timestamp < ADVISOR_CACHE_TTL) {
      setAdvisor(cachedAdvisor.data)
      latestAdvisorRef.current = cachedAdvisor.data
      setError(null)
      setLoadingAdvisor(false)
      latestPromptRef.current = prompt
      return
    }

    if (prompt === latestPromptRef.current && latestAdvisorRef.current) {
      // No new data
      return
    }

    let cancelled = false
    const fetchAdvisor = async () => {
      try {
        setLoadingAdvisor(true)
        setError(null)
        latestPromptRef.current = prompt
        const rawText = await generateGeminiContent({ prompt })
        if (cancelled) return
        const parsed = parseGeminiJson(rawText)
        if (parsed) {
          setAdvisor(parsed)
          latestAdvisorRef.current = parsed
          advisorCache.set(prompt, { data: parsed, timestamp: Date.now() })
        } else {
          const fallbackAdvisor = {
            headline: "Credit insights ready",
            scoreOutlook: rawText || "Unable to parse structured response.",
            keyFactors: [],
            recommendations: [],
            whatIfScenarios: [],
            watchouts: [],
          }
          setAdvisor(fallbackAdvisor)
          latestAdvisorRef.current = fallbackAdvisor
          advisorCache.set(prompt, { data: fallbackAdvisor, timestamp: Date.now() })
        }
      } catch (error) {
        if (!cancelled) {
          setError(error)
          setAdvisor(null)
          latestAdvisorRef.current = null
        }
      } finally {
        if (!cancelled) {
          setLoadingAdvisor(false)
        }
      }
    }

    fetchAdvisor()

    return () => {
      cancelled = true
    }
  }, [prompt, loadingCredit, loadingTransactions])

  return {
    advisor,
    profile: creditHealth,
    loading: loadingAdvisor || loadingCredit || loadingTransactions,
    error: error || creditError,
  }
}

export default useCreditAdvisor
