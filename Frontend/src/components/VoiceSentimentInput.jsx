import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from './ui/button'
import api from '../services/api'

export const VoiceSentimentInput = ({ onTransactionAdded }) => {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [transcript, setTranscript] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('en-US')
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
    recognitionRef.current.lang = selectedLanguage

    recognitionRef.current.onresult = async (event) => {
      const text = event.results[0][0].transcript
      console.log('Voice Transcript:', text)
      setTranscript(text)
      
      setIsListening(false)
      setIsProcessing(true)
      setStatusMessage('🔍 Analyzing and detecting multiple transactions...')

      try {
        // Check if user is authenticated
        const token = localStorage.getItem('taxwise_token')
        if (!token) {
          console.warn('⚠️ No authentication token found')
          setStatusMessage('⚠️ Please login to save transactions')
          setTimeout(() => setStatusMessage(''), 4000)
          setIsProcessing(false)
          return
        }
        
        // Split text into multiple transactions
        const transactions = splitIntoTransactions(text)
        
        if (transactions.length === 0) {
          setStatusMessage('⚠ Could not detect any transactions. Please mention amounts and context.')
          setTimeout(() => setStatusMessage(''), 4000)
          setIsProcessing(false)
          return
        }

        setStatusMessage(`🔍 Found ${transactions.length} transaction(s), processing...`)

        // Process each transaction
        let successCount = 0
        for (const txText of transactions) {
          console.log('Processing transaction text:', txText)
          const analysis = analyzeSentimentAndExtractTransaction(txText)
          console.log('Analysis result:', analysis)
          
          if (!analysis.amount) {
            console.warn('⚠️ Skipping transaction - no amount detected:', txText)
            console.log('Full analysis:', analysis)
            continue
          }
          
          console.log('✓ Valid transaction detected:', {
            amount: analysis.amount,
            type: analysis.type,
            category: analysis.category
          })

          // Create transaction via API
          const transactionData = {
            amount: analysis.amount,
            type: analysis.type,
            category: analysis.category,
            description: analysis.description || txText,
            date: new Date().toISOString(),
          }

          console.log('📤 Sending transaction to API:', transactionData)
          
          try {
            const response = await api.post('/transactions', transactionData)
            console.log('📥 Full API Response:', response)
            
            // Handle different response formats
            if (response && (response.status === 'success' || response.data)) {
              successCount++
              const transactionResult = response.data || response
              console.log('✅ Transaction successfully created:', transactionResult)
              onTransactionAdded?.(transactionResult)
            } else {
              console.warn('⚠️ Unexpected API response format:', response)
            }
          } catch (apiError) {
            console.error('❌ API Error:', apiError)
            console.error('❌ Error details:', apiError.message)
            // Continue to next transaction instead of failing all
          }
        }

        if (successCount > 0) {
          setStatusMessage(`✓ Successfully recorded ${successCount} transaction(s)!`)
          setTimeout(() => {
            setStatusMessage('')
            setTranscript('')
          }, 3000)
        } else {
          setStatusMessage('⚠ Could not process any transactions. Please try again.')
          setTimeout(() => setStatusMessage(''), 4000)
        }
      } catch (error) {
        console.error('Transaction processing error:', error)
        setStatusMessage(`✗ Error: ${error.response?.data?.message || error.message}`)
        setTimeout(() => setStatusMessage(''), 4000)
      } finally {
        setIsProcessing(false)
      }
    }

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      setIsProcessing(false)
      
      const errorMsg = event.error === 'no-speech' 
        ? '⚠ No speech detected. Try again.' 
        : '✗ Voice input error.'
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
  }, [onTransactionAdded, selectedLanguage])

  /**
   * Robust transaction splitting using pattern matching and financial action detection
   * Handles complex cases like: "Paid 1500 for Uber and Rs 200 I received from my mother"
   */
  const splitIntoTransactions = (text) => {
    // Financial action verbs that typically start a transaction
    const transactionTriggers = [
      'paid', 'spent', 'bought', 'purchased', 'received', 'got', 'earned',
      'sent', 'transferred', 'deposited', 'withdrew', 'invested', 'donated',
      'refunded', 'reimbursed', 'collected', 'gave', 'lent', 'borrowed'
    ]
    
    // Create regex pattern to match transaction triggers with amounts
    // Matches patterns like: "paid 1500" or "Rs 200 I received"
    const amountPattern = /(?:rs\.?|rupees?|₹)?\s*\d+(?:,\d{3})*(?:\.\d{2})?/gi
    
    // Find all amounts in the text
    const amounts = text.match(amountPattern) || []
    
    if (amounts.length === 0) {
      return [text] // No amounts found, return as single transaction
    }
    
    if (amounts.length === 1) {
      return [text] // Single amount, single transaction
    }
    
    // Multiple amounts detected - use advanced splitting
    const transactions = []
    const lowerText = text.toLowerCase()
    
    // Method 1: Split by sentence boundaries
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0)
    if (sentences.length > 1) {
      sentences.forEach(sentence => {
        if (amountPattern.test(sentence)) {
          transactions.push(sentence)
        }
      })
      if (transactions.length > 0) return transactions
    }
    
    // Method 2: Split by "and" conjunction with context awareness
    const parts = text.split(/\s+and\s+/i)
    if (parts.length > 1) {
      let validTransactions = []
      
      for (let i = 0; i < parts.length; i++) {
        let part = parts[i].trim()
        
        // Check if this part has both amount and action verb
        const hasAmount = amountPattern.test(part)
        const hasAction = transactionTriggers.some(trigger => 
          part.toLowerCase().includes(trigger)
        )
        
        // If part has amount but no action, try to borrow action from previous part
        if (hasAmount && !hasAction && i > 0) {
          const prevAction = transactionTriggers.find(trigger =>
            parts[i - 1].toLowerCase().includes(trigger)
          )
          if (prevAction) {
            // Inherit context from previous (e.g., "Paid 1500 for Uber and 200 for food")
            validTransactions.push(part)
          }
        } else if (hasAmount && hasAction) {
          validTransactions.push(part)
        } else if (hasAmount) {
          // Has amount but context unclear, include anyway
          validTransactions.push(part)
        }
      }
      
      if (validTransactions.length > 0) return validTransactions
    }
    
    // Method 3: Pattern-based extraction - find each amount with surrounding context
    const contextWindow = 50 // characters before/after amount
    const extractedTransactions = []
    
    let lastIndex = 0
    const amountMatches = [...text.matchAll(amountPattern)]
    
    amountMatches.forEach((match, idx) => {
      const amountPos = match.index
      
      // Extract context around this amount
      let start = Math.max(0, amountPos - contextWindow)
      let end = Math.min(text.length, amountPos + match[0].length + contextWindow)
      
      // Adjust start to nearest word boundary or transaction trigger
      while (start > 0 && text[start] !== ' ' && text[start] !== '.') start--
      
      // Look for transaction trigger before the amount
      const beforeText = text.substring(start, amountPos).toLowerCase()
      const hasTrigger = transactionTriggers.some(trigger => beforeText.includes(trigger))
      
      if (hasTrigger) {
        // Find where the trigger starts
        for (const trigger of transactionTriggers) {
          const triggerPos = beforeText.lastIndexOf(trigger)
          if (triggerPos >= 0) {
            start = start + triggerPos
            break
          }
        }
      }
      
      // Adjust end to nearest sentence boundary or next amount
      if (idx < amountMatches.length - 1) {
        end = Math.min(end, amountMatches[idx + 1].index)
      }
      
      let context = text.substring(start, end).trim()
      
      // Clean up extracted text
      context = context.replace(/^(and|but|also|then)\s+/i, '')
      
      if (context.length > 5 && amountPattern.test(context)) {
        extractedTransactions.push(context)
      }
    })
    
    if (extractedTransactions.length > 0) return extractedTransactions
    
    // Fallback: return original text if no splitting possible
    return [text]
  }

  /**
   * Analyzes sentiment from speech and determines if it's an inflow or outflow
   * Uses keyword matching and context analysis
   */
  const analyzeSentimentAndExtractTransaction = (text) => {
    const lowerText = text.toLowerCase()
    
    // Extract amount - looks for numbers including decimals and commas
    // Also handles Indian numbering with lakhs/crores and Hindi numbers
    
    // First try to find explicit currency amounts
    let amount = null
    
    // Match patterns: ₹500, Rs 500, Rs. 500, 500 rupees, 500 rupaye
    const currencyMatch = lowerText.match(/(?:₹|rs\.?\s*|rupees?\s*|rupaye\s*)(\d+(?:,\d{3})*(?:\.\d{2})?)/i)
    if (currencyMatch) {
      amount = parseFloat(currencyMatch[1].replace(/,/g, ''))
      console.log('💰 Currency match found:', amount)
    }
    
    // If no currency match, try plain numbers (more flexible)
    if (!amount) {
      const plainMatch = lowerText.match(/(\d+(?:[,.]\d+)*)/)
      if (plainMatch) {
        // Handle both comma and decimal separators
        const cleaned = plainMatch[0].replace(/,/g, '')
        amount = parseFloat(cleaned)
        console.log('🔢 Plain number match found:', amount)
      }
    }
    
    // Handle Hindi/Indian expressions and slang
    if (!amount) {
      // K notation: 5k, 10k (thousands)
      if (/(\d+(?:\.\d+)?)\s*k(?!\w)/i.test(lowerText)) {
        const match = lowerText.match(/(\d+(?:\.\d+)?)\s*k(?!\w)/i)
        amount = parseFloat(match[1]) * 1000
      }
      // Lakh: 2 lakh, 5.5 lakh
      else if (/(\d+(?:\.\d+)?)\s*(?:lakh|lac|लाख)/i.test(lowerText)) {
        const match = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|लाख)/i)
        amount = parseFloat(match[1]) * 100000
      }
      // Crore: 1 crore, 2.5 crore
      else if (/(\d+(?:\.\d+)?)\s*(?:crore|करोड़)/i.test(lowerText)) {
        const match = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:crore|करोड़)/i)
        amount = parseFloat(match[1]) * 10000000
      }
      // Thousand: 5 thousand, 10 hajar
      else if (/(\d+(?:\.\d+)?)\s*(?:thousand|hajar|हज़ार|hazar)/i.test(lowerText)) {
        const match = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:thousand|hajar|हज़ार|hazar)/i)
        amount = parseFloat(match[1]) * 1000
      }
      // Hundred: 5 hundred, sau
      else if (/(\d+(?:\.\d+)?)\s*(?:hundred|sau|सौ)/i.test(lowerText)) {
        const match = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:hundred|sau|सौ)/i)
        amount = parseFloat(match[1]) * 100
      }
    }
    
    // Slang amount detection: "paanch sau" (५०० - 500), "das rupaye" (१० - 10)
    if (!amount) {
      const hindiNumbers = {
        // Prioritize compound numbers first (check longer phrases first)
        'paanch sau': 500, 'पांच सौ': 500, 'पाँच सौ': 500,
        'das hajar': 10000, 'दस हजार': 10000,
        'pachas': 50, 'पचास': 50, 'sau': 100, 'सौ': 100,
        'hajar': 1000, 'हजार': 1000,
        'ek': 1, 'एक': 1, 'do': 2, 'दो': 2, 'teen': 3, 'तीन': 3,
        'char': 4, 'चार': 4, 'paanch': 5, 'पांच': 5, 'पाँच': 5,
        'chhe': 6, 'छह': 6, 'saat': 7, 'सात': 7, 'aath': 8, 'आठ': 8,
        'nau': 9, 'नौ': 9, 'das': 10, 'दस': 10, 'bees': 20, 'बीस': 20
      }
      
      // Sort by length to check longer phrases first (more specific)
      const sortedEntries = Object.entries(hindiNumbers).sort((a, b) => b[0].length - a[0].length)
      
      for (const [word, value] of sortedEntries) {
        if (lowerText.includes(word)) {
          amount = value
          console.log('🗣️ Hindi number match found:', word, '=', amount)
          break
        }
      }
    }
    
    // Final amount check
    if (amount) {
      console.log('✅ Final amount extracted:', amount, 'from text:', text)
    } else {
      console.warn('❌ No amount found in text:', text)
    }
    
    // Sentiment analysis for inflow vs outflow (English + Hindi + Slang)
    const positiveInflowWords = [
      'received', 'got', 'earned', 'income', 'salary', 'profit', 'gain', 
      'bonus', 'commission', 'refund', 'reimbursement', 'credit', 'deposit',
      'payment received', 'money received', 'paid to me', 'collected',
      'freelance payment', 'client paid', 'revenue', 'sales', 'winning',
      'receive', 'get', 'earn', 'incoming', 'credited', 'transferred to me',
      // Hindi words (transliterated)
      'mila', 'milaa', 'kamaya', 'aamdani', 'vetan', 'tankhah', 'labh',
      'प्राप्त', 'मिला', 'कमाया', 'आमदनी', 'वेतन', 'तनख्वाह', 'लाभ',
      // Indian slang & colloquial
      'mile', 'aaya', 'आया', 'aa gaya', 'आ गया', 'paisa aaya', 'पैसा आया',
      'paise mile', 'पैसे मिले', 'cash mila', 'payment aa gayi', 'पेमेंट आ गई',
      'cleared', 'credit ho gaya', 'क्रेडिट हो गया', 'account mein aaya',
      'from', 'se mila', 'से मिला', 'se aaya', 'wapas mila', 'वापस मिला',
      'liya', 'लिया' // context: "paise liye" = took money (received)
    ]
    
    const negativeOutflowWords = [
      'spent', 'paid for', 'expense', 'bought', 'purchase', 'loss', 'cost',
      'bill', 'debit', 'shopping', 'invested', 'donation',
      'sent money', 'transferred', 'withdrawal', 'emi', 'subscription',
      'gave', 'lent', 'repaid', 'fee', 'charges', 'fine', 'spend', 'paid',
      // Hindi words (transliterated)
      'kharch', 'kharcha', 'diya', 'kharida', 'bhara', 'lagaya',
      'खर्च', 'खर्चा', 'दिया', 'खरीदा', 'भरा', 'लगाया',
      // Indian slang & colloquial
      'de diya', 'दे दिया', 'de diye', 'दे दिये', 'kar diya', 'कर दिया',
      'kharch kar diya', 'खर्च कर दिया', 'khareed liya', 'खरीद लिया',
      'pay kiya', 'पे किया', 'payment kiya', 'पेमेंट किया', 'bhara', 'भरा',
      'chukaya', 'चुकाया', 'lagaye', 'लगाये', 'paisa gaya', 'पैसा गया',
      'udaya', 'उड़ाया', 'phoonk diya', 'फूंक दिया', // slang: wasted money
      'lut gaya', 'लुट गया', 'barbaad', 'बर्बाद', // slang: lost/wasted
      'for', 'ke liye', 'के लिए', 'mein', 'में', 'pe', 'पे', 'par', 'पर'
    ]
    
    // Calculate sentiment scores with weighted priorities
    let inflowScore = 0
    let outflowScore = 0
    
    // High priority inflow indicators (stronger weight)
    const highPriorityInflow = ['received', 'receive', 'got', 'earned', 'income', 'salary', 'credited']
    highPriorityInflow.forEach(word => {
      if (lowerText.includes(word)) inflowScore += 5
    })
    
    // Regular inflow words
    positiveInflowWords.forEach(word => {
      if (lowerText.includes(word) && !highPriorityInflow.includes(word)) {
        inflowScore += 2
      }
    })
    
    // High priority outflow indicators
    const highPriorityOutflow = ['spent', 'paid for', 'bought', 'purchase']
    highPriorityOutflow.forEach(word => {
      if (lowerText.includes(word)) outflowScore += 5
    })
    
    // Regular outflow words
    negativeOutflowWords.forEach(word => {
      if (lowerText.includes(word) && !highPriorityOutflow.includes(word)) {
        outflowScore += 2
      }
    })
    
    // Context-based sentiment analysis with Indian patterns
    // Pattern: "from [source]" / "se mila" usually indicates inflow
    if (lowerText.match(/from\s+\w+|by\s+\w+|se\s+mila|se\s+aaya|से\s+मिला|से\s+आया/)) {
      inflowScore += 2
    }
    
    // Pattern: "for [item/service]" / "ke liye" usually indicates outflow
    if (lowerText.match(/for\s+\w+|on\s+\w+|ke\s+liye|के\s+लिए|mein\s+|में\s+|pe\s+|पे\s+/)) {
      outflowScore += 1
    }
    
    // Strong inflow indicators - Hinglish patterns
    if (lowerText.match(/paisa\s+aaya|paise\s+mile|payment\s+aa\s+gayi|credit\s+hua|account\s+mein\s+aaya/)) {
      inflowScore += 3
    }
    
    // Strong outflow indicators - Hinglish patterns
    if (lowerText.match(/paisa\s+diya|paise\s+diye|de\s+diya|kharch\s+kiya|pay\s+kiya|khareed\s+liya/)) {
      outflowScore += 3
    }
    
    // Rupee symbol or "rupaye" mentions with contextual verbs
    if (lowerText.match(/₹|rupaye|rupees|rs\.?/)) {
      // Check surrounding words for transaction direction
      if (lowerText.match(/mila|mile|received|got|earned|aaya|से\s+मिल/)) {
        inflowScore += 1
      } else if (lowerText.match(/diya|spent|paid|kharcha|kharch|के\s+लिए/)) {
        outflowScore += 1
      }
    }
    
    // Determine transaction type based on sentiment scores
    const type = inflowScore > outflowScore ? 'credit' : 'debit'
    const sentiment = inflowScore > outflowScore ? 'positive' : 'negative'
    
    // Category detection with Hindi support + Indian slang
    const categoryMap = {
      'salary': [
        'salary', 'wages', 'paycheck', 'pay', 'vetan', 'tankhah', 'वेतन', 'तनख्वाह',
        'mazuri', 'paisa', 'pagar', 'पगार', 'माहवारी' // Indian slang
      ],
      'freelance': [
        'freelance', 'project', 'client', 'contract', 'gig', 'side hustle',
        'kaam', 'काम', 'project ka paisa', 'client payment'
      ],
      'investment': [
        'dividend', 'interest', 'investment return', 'stocks', 'mutual fund', 'nivesh', 'निवेश',
        'sip', 'share', 'crypto', 'bitcoin', 'trading', 'profit'
      ],
      'refund': [
        'refund', 'reimbursement', 'cashback', 'vapsi', 'वापसी',
        'return', 'wapas', 'वापस', 'paisa wapas', 'money back'
      ],
      'food': [
        'food', 'restaurant', 'lunch', 'dinner', 'breakfast', 'meal', 'swiggy', 'zomato', 'khana', 'खाना', 'bhojan', 'भोजन',
        'chai', 'tea', 'coffee', 'snacks', 'nashta', 'nasta', 'नाश्ता', 'biryani', 'pizza', 'burger',
        'dhabha', 'ढाबा', 'canteen', 'tiffin', 'टिफिन', 'party', 'treat', 'मस्ती'
      ],
      'transport': [
        'uber', 'ola', 'taxi', 'metro', 'bus', 'travel', 'petrol', 'fuel', 'cab', 'yatra', 'यात्रा',
        'rickshaw', 'auto', 'ricksha', 'रिक्शा', 'rapido', 'bike', 'scooty', 'ride',
        'parking', 'toll', 'टोल', 'diesel', 'डीजल'
      ],
      'shopping': [
        'shopping', 'clothes', 'amazon', 'flipkart', 'purchase', 'bought', 'kharidari', 'खरीदारी',
        'kapde', 'कपड़े', 'shoes', 'jute', 'जूते', 'mall', 'मॉल', 'meesho', 'myntra',
        'gift', 'tohfa', 'तोहफा', 'saaman', 'सामान', 'stuff'
      ],
      'utilities': [
        'electricity', 'water', 'gas', 'internet', 'mobile', 'bill', 'broadband', 'bijli', 'बिजली',
        'recharge', 'रिचार्ज', 'wifi', 'jio', 'airtel', 'vi', 'bsnl', 'cylinder', 'सिलेंडर',
        'paani', 'पानी', 'light bill', 'phone bill'
      ],
      'entertainment': [
        'movie', 'netflix', 'spotify', 'prime', 'hotstar', 'game', 'entertainment', 'manoranjan', 'मनोरंजन',
        'film', 'फिल्म', 'cinema', 'सिनेमा', 'pub', 'bar', 'club', 'concert', 'show',
        'picnic', 'trip', 'माझा', 'मौज', 'timepass', 'टाइमपास'
      ],
      'health': [
        'doctor', 'medicine', 'hospital', 'pharmacy', 'health', 'medical', 'swasthya', 'स्वास्थ्य', 'dawaai', 'दवाई',
        'dawai', 'दवा', 'checkup', 'test', 'lab', 'clinic', 'chemist', 'tablets', 'गोली',
        'injection', 'injection', 'surgery', 'ilaj', 'इलाज'
      ],
      'education': [
        'course', 'book', 'tuition', 'education', 'learning', 'training', 'shiksha', 'शिक्षा',
        'fees', 'फीस', 'exam', 'परीक्षा', 'coaching', 'कोचिंग', 'class', 'क्लास',
        'udemy', 'coursera', 'notes', 'नोट्स', 'books', 'किताबें'
      ],
      'rent': [
        'rent', 'lease', 'housing', 'kiraya', 'किराया',
        'ghar ka kiraya', 'room rent', 'flat', 'फ्लैट', 'pg', 'hostel', 'हॉस्टल'
      ],
      'emi': [
        'emi', 'installment', 'loan', 'kist', 'किस्त',
        'karj', 'कर्ज', 'udhaar', 'उधार', 'payment', 'due', 'credit card'
      ],
      'other_income': [
        'mila', 'mile', 'मिला', 'मिले', 'प्राप्त',
        'aaya', 'आया', 'gift', 'bonus', 'tip', 'baksheesh', 'बख्शीश'
      ]
    }
    
    let category = 'other'
    for (const [cat, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        category = cat
        break
      }
    }
    
    // If it's an inflow but category is expense-related, adjust category
    if (type === 'credit' && !['salary', 'freelance', 'investment', 'refund', 'other_income'].includes(category)) {
      category = 'other_income'
    }
    
    // Create intelligent description
    let description = text.charAt(0).toUpperCase() + text.slice(1)
    
    // Clean up description if it's too generic
    if (description.length < 10 && amount) {
      description = `${type === 'credit' ? 'Received' : 'Spent'} ₹${amount} - ${category}`
    }
    
    const result = {
      amount,
      type,
      category,
      description,
      sentiment,
      inflowScore,
      outflowScore,
    }
    
    console.log('📊 Complete analysis:', result)
    return result
  }

  const handleMicClick = () => {
    if (!recognitionRef.current) {
      setStatusMessage('✗ Speech recognition not supported in this browser')
      setTimeout(() => setStatusMessage(''), 3000)
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
      setStatusMessage('')
    } else {
      try {
        setTranscript('')
        recognitionRef.current.start()
        setIsListening(true)
        setStatusMessage('🎤 सुन रहे हैं... बोलिए जैसे "5k salary mili" या "खाने में 500 खर्च किए"')
      } catch (error) {
        console.error('Failed to start recognition:', error)
        setStatusMessage('✗ Could not start voice input')
        setTimeout(() => setStatusMessage(''), 3000)
      }
    }
  }

  const languages = [
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
    { code: 'en-IN', name: 'English (India)', flag: '🇮🇳' },
    { code: 'hi-IN', name: 'हिंदी (Hindi)', flag: '🇮🇳' },
    { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
    { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
    { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
    { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
    { code: 'ar-SA', name: 'العربية', flag: '🇸🇦' },
  ]

  return (
    <div className="flex flex-col gap-3">
      {/* Language Selector */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          Language:
        </label>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          disabled={isListening || isProcessing}
          className="rounded-full border border-white/30 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 transition-all hover:border-sky-400/60 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
      </div>

      <Button
        size="lg"
        variant={isListening ? 'destructive' : 'default'}
        onClick={handleMicClick}
        disabled={isProcessing}
        className={`gap-2 rounded-full transition-all shadow-lg ${
          isListening 
            ? 'animate-pulse bg-red-500 text-white hover:bg-red-600 shadow-red-500/50' 
            : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-sky-500/50'
        }`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : isListening ? (
          <>
            <MicOff className="h-5 w-5" />
            Stop Listening
          </>
        ) : (
          <>
            <Mic className="h-5 w-5" />
            Start Listening
          </>
        )}
      </Button>

      <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
        {selectedLanguage.startsWith('hi') ? (
          <>
            <p className="font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              आय: "5k salary मिली", "ग्राहक से 2000 आये", "मम्मी से पांच सौ रुपये मिले"
            </p>
            <p className="font-semibold flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-rose-500" />
              खर्च: "खाने में 500 उड़ाए", "uber के लिए 1k दिया", "कपड़े में 2000 खर्च किये"
            </p>
            <p className="font-semibold text-sky-600 dark:text-sky-400">
              💡 एक साथ: "1500 uber दिया और माँ से 200 मिला"
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              Inflow: "Mujhe 5k salary mili", "Client se 2000 aaye", "Got ₹500 from mom"
            </p>
            <p className="font-semibold flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-rose-500" />
              Outflow: "Khane mein 500 udaye", "Paid 1k for uber", "Shopping pe 2k kharch kiye"
            </p>
            <p className="font-semibold text-sky-600 dark:text-sky-400">
              💡 Multiple: "1500 uber ke liye diya aur 200 mom se mile"
            </p>
          </>
        )}
      </div>
      
      {transcript && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-2 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
          <p className="font-semibold">You said:</p>
          <p className="italic">"{transcript}"</p>
        </div>
      )}
      
      {statusMessage && (
        <div className={`rounded-2xl border px-4 py-2 text-sm animate-fade-in ${
          statusMessage.includes('✓') 
            ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
            : statusMessage.includes('✗') || statusMessage.includes('⚠')
            ? 'border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
            : 'border-slate-200 bg-slate-50/80 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300'
        }`}>
          {statusMessage}
        </div>
      )}
    </div>
  )
}
