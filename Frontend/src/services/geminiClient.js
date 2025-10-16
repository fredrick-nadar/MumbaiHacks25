const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ""

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

export const isGeminiConfigured = () => Boolean(GEMINI_API_KEY)

const sanitiseText = (text = "") => {
  if (typeof text !== "string") return ""
  const trimmed = text.trim()
  if (/^```[a-zA-Z0-9]*[\r\n]/.test(trimmed) && trimmed.endsWith('```')) {
    return trimmed.replace(/^```[a-zA-Z0-9]*[\r\n]?/i, '').replace(/```$/i, '').trim()
  }
  return trimmed
}

export const generateGeminiContent = async ({ prompt, messages = [], systemInstruction }) => {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key missing. Set VITE_GEMINI_API_KEY in your environment.")
  }

  let contents = []

  if (Array.isArray(messages) && messages.length) {
    contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.text ?? '' }],
    }))
  } else if (prompt) {
    contents = [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ]
  } else {
    throw new Error('Gemini request missing prompt or messages payload')
  }

  const payload = { contents }

  if (systemInstruction) {
    payload.systemInstruction = {
      role: "system",
      parts: [{ text: systemInstruction }],
    }
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}))
    const message = errorPayload?.error?.message || `Gemini request failed with status ${response.status}`
    throw new Error(message)
  }

  const data = await response.json().catch(() => null)
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  return sanitiseText(text)
}

export const parseGeminiJson = (rawText) => {
  if (!rawText) return null
  try {
    const cleaned = sanitiseText(rawText)
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}
