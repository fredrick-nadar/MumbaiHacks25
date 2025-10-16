const { GoogleGenerativeAI } = require('@google/generative-ai')

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const TEXT_MODEL_ID = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
const IMAGE_MODEL_ID = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-exp'

let client = null
let textModel = null
let imageModel = null

const SYSTEM_PROMPT = `You are a financial data specialist. Users upload raw bank, credit card, or ledger CSV/PDF data.
Clean and enrich each transaction.
For every incoming row, return a JSON array where each object has:
- description: original description text (string)
- amount: original amount as a number (positive for inflow, negative for outflow)
- date: ISO8601 date string (YYYY-MM-DD)
- category: one of ["income","expense","transfer"]
- subgroup: granular label such as salary, emi, sip, rent, insurance, grocery, fuel, shopping, utilities, fees, investment, refund, cash_withdrawal, misc
- isRecurring: boolean true/false if the transaction happens regularly (monthly SIP/EMI/salary etc.)
- patternType: describe the recurring pattern if applicable (e.g. "EMI", "SIP", "Salary", "Rent"), otherwise null
- notes: short enrichment note about the transaction or pattern (string, can be empty)

Rules:
* Do not invent transactions.
* Preserve monetary sign conventions.
* If you are unsure, keep subgroup as "misc" and explain in notes.
* Respond ONLY with valid JSON (array).`

const REPORT_PROMPT = `You are a senior financial analyst helping a tax advisory firm summarise a client's workspace.
Given the JSON snapshot of key metrics, create 3 short paragraphs (2-3 sentences each):
- paragraph 1: overall cash flow and health score context
- paragraph 2: highlight category mix and any spikes or savings opportunities
- paragraph 3: tax regime recommendation mentioning tax saved and actionable advice
Keep the tone professional, optimistic, and grounded in the numbers. Avoid markdown tables and keep values in INR with the ₹ symbol.`

const PDF_PROMPT = `You are a bank statement parser. A user has provided raw text extracted from a PDF statement.
Identify table-like lines and convert them into transactions. Return ONLY valid JSON (array) where each object has:
{
  "date": "YYYY-MM-DD",
  "description": string,
  "amount": number (positive for credits/inflows, negative for debits/outflows),
  "type": "credit" | "debit",
  "balance": number | null
}

Guidelines:
- Infer the amount sign based on debit/credit columns or words like DR/CR.
- Skip headers, running totals, and metadata rows.
- If the day/month lacks a year, infer it from context (prefer current or previous year) and return ISO date.
- If balance is absent, set it to null.
- Do not include narrative text without numeric amounts.
- Respond with JSON only.`

const getClient = () => {
  if (!GEMINI_API_KEY) return null
  if (!client) {
    client = new GoogleGenerativeAI(GEMINI_API_KEY)
  }
  return client
}

const getTextModel = () => {
  const gemini = getClient()
  if (!gemini) return null
  if (!textModel) {
    textModel = gemini.getGenerativeModel({ model: TEXT_MODEL_ID })
  }
  return textModel
}

const getImageModel = () => {
  const gemini = getClient()
  if (!gemini) return null
  if (!imageModel) {
    imageModel = gemini.getGenerativeModel({ model: IMAGE_MODEL_ID })
  }
  return imageModel
}

const buildContents = (messages = []) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return []
  }
  return messages
    .filter((msg) => typeof msg?.text === 'string' && msg.text.trim().length > 0)
    .map((msg) => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.text }],
    }))
}

const runTextModel = async ({ messages, systemInstruction, fallbackPrompt }) => {
  const model = getTextModel()
  if (!model) return null

  const contents = messages && messages.length
    ? buildContents(messages)
    : buildContents([{ role: 'user', text: fallbackPrompt }])

  if (!contents.length) return null

  const response = await model.generateContent({
    contents,
    systemInstruction: systemInstruction
      ? { role: 'system', parts: [{ text: systemInstruction }] }
      : undefined,
  })

  const output = response?.response?.text?.()
  return typeof output === 'string' ? output.trim() : null
}

async function enhanceTransactionsWithGemini(transactions = []) {
  if (!transactions.length) {
    return null
  }

  try {
    const sample = transactions.slice(0, 150)
    const text = await runTextModel({
      systemInstruction: SYSTEM_PROMPT,
      fallbackPrompt: `Transactions JSON:\n${JSON.stringify(sample)}`,
    })

    if (!text) return null
    const trimmed = text.replace(/^```json\s*/i, '').replace(/```$/i, '')
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed : null
  } catch (error) {
    console.error('Gemini enrichment failed', error.message)
    return null
  }
}

async function generateAnalyticsSummary(snapshot = {}) {
  try {
    return await runTextModel({
      fallbackPrompt: `${REPORT_PROMPT}\n\nAnalytics Snapshot JSON:\n${JSON.stringify(snapshot)}`,
    })
  } catch (error) {
    console.error('Gemini analytics summary failed', error.message)
    return null
  }
}

async function parsePdfStatementWithGemini(statementText = '') {
  if (!statementText) {
    return null
  }

  try {
    const truncated = statementText.length > 18000 ? statementText.slice(0, 18000) : statementText
    const text = await runTextModel({
      systemInstruction: PDF_PROMPT,
      fallbackPrompt: `Statement Text:\n${truncated}`,
    })
    if (!text) return null
    const trimmed = text.replace(/^```json\s*/i, '').replace(/```$/i, '')
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed : null
  } catch (error) {
    console.error('Gemini PDF parsing failed', error.message)
    return null
  }
}

async function generateReportHeroImage(insights = {}) {
  const model = getImageModel()
  if (!model) return null

  const prompt = `Create a modern, minimal illustration for a financial analytics report. Highlight monthly inflows of ₹${insights.income || '—'}, outflows of ₹${insights.expenses || '—'}, and potential tax savings of ₹${insights.taxSavings || '—'}. Use cool blues with emerald accents, depict dashboards and charts, and keep it professional.`

  try {
    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    })

    const parts = response?.response?.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find((part) => part.inlineData?.data)
    return imagePart?.inlineData?.data || null
  } catch (error) {
    console.error('Gemini image generation failed', error.message)
    return null
  }
}

module.exports = {
  enhanceTransactionsWithGemini,
  generateAnalyticsSummary,
  parsePdfStatementWithGemini,
  generateReportHeroImage,
}
