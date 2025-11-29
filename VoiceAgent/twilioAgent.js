/**
 * Twilio Agent - Handles voice calls and integrates with Master Agent + MongoDB
 */

import twilio from 'twilio';
import { config } from './config/env.js';
import MasterAgent from './agents/master/masterAgent.js';
import ExpenseAgent from './agents/slaves/expense/expenseAgent.js';
import TaxAgent from './agents/slaves/tax/taxAgent.js';
import InvestmentAgent from './agents/slaves/investment/investmentAgent.js';
import IncomeAgent from './agents/slaves/income/incomeAgent.js';
import dbService from './services/dbService.js';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Initialize agents
const agentRegistry = {
  ExpenseAgent: new ExpenseAgent(),
  TaxAgent: new TaxAgent(),
  InvestmentAgent: new InvestmentAgent(),
  IncomeAgent: new IncomeAgent(),
};

const masterAgent = new MasterAgent(agentRegistry);

// Store call sessions with user info
const callSessions = new Map();

/**
 * Handle incoming call
 * IMPORTANT: Must respond within 15 seconds to avoid Twilio timeout
 * MongoDB Integration: Fetches user profile for personalized greeting
 */
export async function handleIncomingCall(req, res) {
  console.log('[Twilio] Incoming call received');
  const twiml = new VoiceResponse();

  try {
    const fromNumber = req.body.From;
    const callSid = req.body.CallSid;

    // Try to find user by phone number in MongoDB
    let user = null;
    try {
      user = await dbService.findUserByPhone(fromNumber);
      console.log('[DB] User found:', user ? user.name : 'Not registered');
    } catch (err) {
      console.warn('[DB] findUserByPhone failed:', err.message);
    }

    // Store call session with user info
    const conversationId = `${fromNumber}-${Date.now()}`;
    callSessions.set(callSid, {
      conversationId,
      userId: user?._id,
      userName: user?.name,
      userPhone: fromNumber
    });

    // Start voice conversation in MongoDB (best-effort)
    try {
      await dbService.startVoiceConversation({
        conversationId,
        callSid,
        fromNumber,
        toNumber: req.body.To
      });
      console.log('[DB] Conversation started:', conversationId);
    } catch (err) {
      console.warn('[DB] startVoiceConversation failed:', err.message);
    }

    // Personalized greeting based on user profile
    const greeting = user 
      ? `नमस्ते ${user.name} जी! मैं आपका वित्तीय सहायक हूँ। आप मुझसे खर्च, कर बचत, और निवेश के बारे में पूछ सकते हैं।`
      : 'नमस्ते! मैं आपका वित्तीय सहायक हूँ। आप मुझसे खर्च, कर बचत, और निवेश के बारे में पूछ सकते हैं।';

    // Use Twilio TTS for fast response (no timeout risk)
    twiml.say({
      voice: 'Google.hi-IN-Standard-A',
      language: 'hi-IN'
    }, greeting);

    // Gather speech input
    const gather = twiml.gather({
      input: 'speech',
      action: '/voice/process',
      method: 'POST',
      language: 'hi-IN',
      speechTimeout: 'auto',
      speechModel: 'phone_call',
      timeout: 5
    });

    gather.say({
      voice: 'Google.hi-IN-Standard-A',
      language: 'hi-IN'
    }, 'कृपया अपनी बात कहें।');

    // If no input, repeat
    twiml.say({
      voice: 'Google.hi-IN-Standard-A',
      language: 'hi-IN'
    }, 'मुझे कुछ सुनाई नहीं दिया। कृपया फिर से कॉल करें।');

    res.type('text/xml');
    res.send(twiml.toString());
    console.log('[Twilio] Greeting sent successfully');

  } catch (error) {
    console.error('[Twilio] handleIncomingCall error:', error);
    twiml.say({
      voice: 'Google.hi-IN-Standard-A',
      language: 'hi-IN'
    }, 'क्षमा करें, कुछ गड़बड़ हुई। कृपया फिर से कॉल करें।');
    twiml.hangup();
    res.type('text/xml');
    res.send(twiml.toString());
  }
}

/**
 * Process speech input
 * MongoDB Integration: Loads user's tax profile, transactions, and monthly summary
 * for personalized AI responses
 */
export async function processVoiceInput(req, res) {
  console.log('[Twilio] Processing voice input');
  const twiml = new VoiceResponse();

  try {
    const speechResult = req.body.SpeechResult;
    const callSid = req.body.CallSid;
    const from = req.body.From;

    console.log(`\n[Twilio] Speech: "${speechResult}"`);
    console.log(`[Twilio] CallSid: ${callSid}`);

    if (!speechResult) {
      twiml.say({
        voice: 'Google.hi-IN-Standard-A',
        language: 'hi-IN'
      }, 'मुझे समझ नहीं आया। कृपया फिर से बोलें।');
      twiml.redirect('/voice/incoming');
      res.type('text/xml');
      res.send(twiml.toString());
      return;
    }

    // Retrieve session and user context from memory
    const session = callSessions.get(callSid) || {
      conversationId: `${from}-${Date.now()}`
    };
    const conversationId = session.conversationId;
    const userId = session.userId;
    const userName = session.userName;

    // Save user message to MongoDB (best-effort)
    try {
      await dbService.addConversationMessage(conversationId, {
        role: 'user',
        content: speechResult,
        language: 'hi',
        transcription: speechResult
      });
      console.log('[DB] User message saved');
    } catch (err) {
      console.warn('[DB] addConversationMessage failed:', err.message);
    }

    // Fetch user financial context from MongoDB for personalized responses
    let userContext = {};
    if (userId) {
      try {
        console.log('[DB] Loading user context for:', userName);
        const [taxProfile, monthlySummary, recentTransactions] = await Promise.all([
          dbService.getUserTaxProfile(userId),
          dbService.getMonthlySummary(userId),
          dbService.getUserTransactions(userId, { limit: 5 })
        ]);

        userContext = {
          userName,
          userId,
          taxProfile,
          monthlySummary,
          recentTransactions
        };

        console.log('[DB] User context loaded:', {
          name: userName,
          income: monthlySummary?.income || 0,
          expenses: monthlySummary?.expenses || 0,
          transactions: recentTransactions?.length || 0
        });
      } catch (err) {
        console.warn('[DB] Failed to load user context:', err.message);
      }
    }

    // Process query with Master Agent (with personalized user context)
    const startTime = Date.now();
    const result = await masterAgent.handleQuery(speechResult, conversationId, userContext);
    const processingTime = Date.now() - startTime;

    // Count words in response
    const wordCount = result.response.split(/\s+/).filter(w => w.length > 0).length;
    const charCount = result.response.length;

    console.log(`[Master Agent] Processed in ${processingTime}ms`);
    console.log(`[Master Agent] Intent:`, result.intent);
    console.log(`[Master Agent] Language:`, result.language);
    console.log(`\n📊 Response Stats:`);
    console.log(`   Words: ${wordCount} ${wordCount <= 70 ? '✅' : '⚠️ EXCEEDS 70!'}`);
    console.log(`   Characters: ${charCount}`);
    console.log(`   Using MongoDB data: ${userContext.taxProfile || userContext.monthlySummary ? '✅ YES' : '❌ NO'}`);
    if (userContext.userName) console.log(`   User: ${userContext.userName}`);
    if (userContext.monthlySummary) console.log(`   Income: ₹${userContext.monthlySummary.income}, Expenses: ₹${userContext.monthlySummary.expenses}`);

    // Save assistant response to MongoDB
    try {
      await dbService.addConversationMessage(conversationId, {
        role: 'assistant',
        content: result.response,
        language: result.language,
        agentsInvolved: result.agentsUsed || [],
        processingTimeMs: processingTime,
        intent: result.intent
      });
      console.log('[DB] Assistant message saved');
    } catch (err) {
      console.warn('[DB] addConversationMessage assistant failed:', err.message);
    }

    // If expense/income detected, save to MongoDB transactions
    if (userId && result.extractedData) {
      try {
        if (result.intent === 'expense' || result.intent === 'track_spending') {
          await dbService.addVoiceTransaction(userId, {
            type: 'debit',
            amount: result.extractedData.amount,
            category: result.extractedData.category || 'Miscellaneous',
            description: result.extractedData.description || speechResult,
            date: result.extractedData.date || new Date(),
            originalQuery: speechResult,
            language: result.language
          }, conversationId);
          console.log('[DB] Expense saved: ₹', result.extractedData.amount);
        }
        else if (result.intent === 'income') {
          await dbService.addVoiceTransaction(userId, {
            type: 'credit',
            amount: result.extractedData.amount,
            category: result.extractedData.source || 'Salary',
            description: result.extractedData.description || speechResult,
            date: result.extractedData.date || new Date(),
            originalQuery: speechResult,
            language: result.language
          }, conversationId);
          console.log('[DB] Income saved: ₹', result.extractedData.amount);
        }
      } catch (err) {
        console.warn('[DB] Failed to save transaction:', err.message);
      }
    }

    // Respond via Twilio TTS (fast and reliable)
    const voiceConfig = getVoiceConfig(result.language);
    const responseText = result.response || 'क्षमा करें, मुझे उत्तर देने में समस्या हुई।';
    
    twiml.say(voiceConfig, responseText);

    // Ask if user wants to continue
    const gather = twiml.gather({
      input: 'speech',
      action: '/voice/process',
      method: 'POST',
      language: voiceConfig.language,
      speechTimeout: 'auto',
      speechModel: 'phone_call',
      timeout: 5
    });

    const continueText = 
      result.language === 'hi' ? 'और कुछ पूछना चाहते हैं?' :
      result.language === 'ta' ? 'வேறு ஏதாவது கேட்க விரும்புகிறீர்களா?' :
      result.language === 'te' ? 'ఇంకేమైనా అడగాలనుకుంటున్నారా?' :
      'Anything else you would like to ask?';

    gather.say(voiceConfig, continueText);

    // If no response, thank and hangup
    const goodbyeText =
      result.language === 'hi' ? 'धन्यवाद! आपका दिन शुभ हो।' :
      result.language === 'ta' ? 'நன்றி! உங்கள் நாள் இனிதாக இருக்கட்டும்.' :
      result.language === 'te' ? 'ధన్యవాదాలు! మీ రోజు శుభంగా ఉండాలి.' :
      'Thank you! Have a great day.';

    twiml.say(voiceConfig, goodbyeText);
    twiml.hangup();

    const twimlResponse = twiml.toString();
    console.log('\n[Twilio] TwiML Response:\n', twimlResponse);
    
    res.type('text/xml');
    res.send(twimlResponse);
    console.log('[Twilio] Response sent successfully\n');

  } catch (error) {
    console.error('[Twilio] processVoiceInput error:', error);
    twiml.say({
      voice: 'Google.hi-IN-Standard-A',
      language: 'hi-IN'
    }, 'क्षमा करें, एक त्रुटि हुई। कृपया बाद में फिर से कॉल करें।');
    twiml.hangup();
    res.type('text/xml');
    res.send(twiml.toString());
  }
}

/**
 * Handle call status callbacks
 * MongoDB Integration: Ends conversation record when call completes
 */
export function handleCallStatus(req, res) {
  const callSid = req.body.CallSid;
  const callStatus = req.body.CallStatus;

  console.log(`[Twilio] Call ${callSid} status: ${callStatus}`);

  // Clean up session and end conversation in MongoDB on call end
  if (callStatus === 'completed' || callStatus === 'failed' || callStatus === 'busy') {
    const session = callSessions.get(callSid);
    if (session?.conversationId) {
      dbService.endVoiceConversation(session.conversationId)
        .then(() => console.log(`[DB] Conversation ended: ${session.conversationId}`))
        .catch(err => console.warn('[DB] endVoiceConversation failed:', err.message));
    }
    callSessions.delete(callSid);
    console.log(`[Twilio] Cleaned up session for ${callSid}`);
  }

  res.sendStatus(200);
}

/**
 * Get voice configuration based on language
 */
function getVoiceConfig(language) {
  const configs = {
    hi: { voice: 'Google.hi-IN-Standard-A', language: 'hi-IN' },
    ta: { voice: 'Google.ta-IN-Standard-A', language: 'ta-IN' },
    te: { voice: 'Google.te-IN-Standard-A', language: 'te-IN' },
    en: { voice: 'Google.en-IN-Standard-A', language: 'en-IN' },
  };
  return configs[language] || configs.en;
}

/**
 * Test endpoint for checking agent status
 * Can be used without MongoDB to test basic functionality
 */
export async function testAgent(req, res) {
  try {
    const query = req.query.q || 'मैंने आज 500 रुपए खाने पर खर्च किए';
    const result = await masterAgent.handleQuery(query, 'test-session', {});

    res.json({
      success: true,
      query,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
