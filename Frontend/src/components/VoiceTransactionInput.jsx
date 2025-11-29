import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { Button } from './ui/button'

export const VoiceTransactionInput = ({ onTransactionAdd }) => {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => {
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false
    recognitionRef.current.lang = 'en-US'

    recognitionRef.current.onresult = async (event) => {
      const transcript = event.results[0][0].transcript
      console.log('Transcript:', transcript)
      
      setIsListening(false)
      setIsProcessing(true)

      try {
        // Parse the transaction from speech
        const transaction = parseTransactionFromSpeech(transcript)
        
        if (transaction) {
          // Call the callback to add transaction
          await onTransactionAdd(transaction)
          
          setStatusMessage(`✓ ${transaction.type === 'credit' ? 'Inflow' : 'Outflow'} of ₹${transaction.amount} recorded`)
          setTimeout(() => setStatusMessage(''), 3000)
        } else {
          setStatusMessage('⚠ Could not understand. Please speak clearly with amount and type')
          setTimeout(() => setStatusMessage(''), 3000)
        }
      } catch (error) {
        console.error('Processing error:', error)
        setStatusMessage(`✗ Error: ${error.message}`)
        setTimeout(() => setStatusMessage(''), 3000)
      } finally {
        setIsProcessing(false)
      }
    }

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      setIsProcessing(false)
      
      const errorMsg = event.error === 'no-speech' 
        ? '⚠ No speech detected. Please try again.' 
        : '✗ Could not process voice input.'
      setStatusMessage(errorMsg)
      setTimeout(() => setStatusMessage(''), 3000)
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [onTransactionAdd])

  const parseTransactionFromSpeech = (text) => {
    const lowerText = text.toLowerCase()
    
    // Extract amount using regex - looks for numbers
    const amountMatch = lowerText.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (!amountMatch) return null
    
    const amount = parseFloat(amountMatch[0].replace(/,/g, ''))
    
    // Determine transaction type based on keywords
    const inflowKeywords = ['received', 'got', 'earned', 'income', 'salary', 'credit', 'inflow', 'payment received', 'deposit']
    const outflowKeywords = ['spent', 'paid', 'expense', 'bought', 'purchase', 'debit', 'outflow', 'payment', 'bill']
    
    let type = 'debit' // default to outflow
    
    if (inflowKeywords.some(keyword => lowerText.includes(keyword))) {
      type = 'credit'
    } else if (outflowKeywords.some(keyword => lowerText.includes(keyword))) {
      type = 'debit'
    }
    
    // Extract category from keywords
    const categoryKeywords = {
      'food': ['food', 'restaurant', 'lunch', 'dinner', 'breakfast', 'meal'],
      'transport': ['uber', 'taxi', 'metro', 'bus', 'travel', 'petrol', 'fuel'],
      'shopping': ['shopping', 'clothes', 'amazon', 'flipkart', 'purchase'],
      'utilities': ['electricity', 'water', 'gas', 'internet', 'mobile', 'bill'],
      'entertainment': ['movie', 'netflix', 'spotify', 'game', 'entertainment'],
      'health': ['doctor', 'medicine', 'hospital', 'pharmacy', 'health'],
      'salary': ['salary', 'wages', 'income'],
      'freelance': ['freelance', 'project', 'client'],
    }
    
    let category = 'other'
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        category = cat
        break
      }
    }
    
    // Create description from the original text
    const description = text.charAt(0).toUpperCase() + text.slice(1)
    
    return {
      amount,
      type,
      category,
      description,
      date: new Date().toISOString(),
    }
  }

  const handleMicClick = () => {
    if (!recognitionRef.current) {
      setStatusMessage('✗ Speech recognition is not supported in your browser')
      setTimeout(() => setStatusMessage(''), 3000)
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
        setStatusMessage('🎤 Listening... Speak your transaction (e.g., "Spent 500 rupees on food")')
      } catch (error) {
        console.error('Failed to start recognition:', error)
        setStatusMessage('✗ Could not start voice input')
        setTimeout(() => setStatusMessage(''), 3000)
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="sm"
        variant={isListening ? 'destructive' : 'outline'}
        onClick={handleMicClick}
        disabled={isProcessing}
        className={`gap-2 rounded-full transition-all ${
          isListening 
            ? 'animate-pulse bg-red-500 text-white hover:bg-red-600' 
            : 'border-white/30 bg-white/70 hover:border-sky-400/60 hover:text-sky-600 dark:border-slate-700/60 dark:bg-slate-900/70'
        }`}
        title="Voice transaction input"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        {isListening ? 'Listening...' : isProcessing ? 'Processing...' : 'Voice Input'}
      </Button>
      {statusMessage && (
        <p className="text-xs text-center animate-fade-in">
          {statusMessage}
        </p>
      )}
    </div>
  )
}
