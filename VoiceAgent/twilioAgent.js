/**
 * Twilio Agent - Handles voice calls and integrates with Master Agent
 */

import twilio from 'twilio';
import { config } from './config/env.js';
import MasterAgent from './agents/master/masterAgent.js';
import ExpenseAgent from './agents/slaves/expense/expenseAgent.js';
import TaxAgent from './agents/slaves/tax/taxAgent.js';
import InvestmentAgent from './agents/slaves/investment/investmentAgent.js';
import IncomeAgent from './agents/slaves/income/incomeAgent.js';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Initialize agents
const agentRegistry = {
  ExpenseAgent: new ExpenseAgent(),
  TaxAgent: new TaxAgent(),
  InvestmentAgent: new InvestmentAgent(),
  IncomeAgent: new IncomeAgent(),
};

const masterAgent = new MasterAgent(agentRegistry);

// Store call sessions
const callSessions = new Map();

/**
 * Handle incoming call
 */
export async function handleIncomingCall(req, res) {
  const twiml = new VoiceResponse();

  // Greet the caller
  twiml.say(
    {
      voice: 'Google.hi-IN-Standard-A',
      language: 'hi-IN',
    },
    'नमस्ते! मैं आपका वित्तीय सहायक हूँ। आप मुझसे खर्च, कर बचत, और निवेश के बारे में पूछ सकते हैं।'
  );

  // Gather speech input
  const gather = twiml.gather({
    input: 'speech',
    action: '/voice/process',
    method: 'POST',
    language: 'hi-IN',
    speechTimeout: 'auto',
    speechModel: 'phone_call',
  });

  gather.say(
    {
      voice: 'Google.hi-IN-Standard-A',
      language: 'hi-IN',
    },
    'कृपया अपनी बात कहें।'
  );

  // If no input, repeat
  twiml.say(
    {
      voice: 'Google.hi-IN-Standard-A',
      language: 'hi-IN',
    },
    'मुझे कुछ सुनाई नहीं दिया। कृपया फिर से कॉल करें।'
  );

  res.type('text/xml');
  res.send(twiml.toString());
}

/**
 * Process speech input
 */
export async function processVoiceInput(req, res) {
  const twiml = new VoiceResponse();

  try {
    const speechResult = req.body.SpeechResult;
    const callSid = req.body.CallSid;
    const from = req.body.From;

    console.log(`\n[Twilio] Speech input: "${speechResult}"`);
    console.log(`[Twilio] CallSid: ${callSid}`);

    if (!speechResult) {
      twiml.say(
        {
          voice: 'Google.hi-IN-Standard-A',
          language: 'hi-IN',
        },
        'मुझे समझ नहीं आया। कृपया फिर से बोलें।'
      );
      twiml.redirect('/voice/incoming');
      res.type('text/xml');
      res.send(twiml.toString());
      return;
    }

    // Store or retrieve conversation ID
    let conversationId = callSessions.get(callSid);
    if (!conversationId) {
      conversationId = `${from}-${Date.now()}`;
      callSessions.set(callSid, conversationId);
    }

    // Process with Master Agent
    const result = await masterAgent.handleQuery(speechResult, conversationId);

    console.log(`[Twilio] Master Agent response:`, result);

    // Respond with AI-generated answer
    if (result.success && result.response) {
      // Determine voice based on detected language
      const voiceConfig = getVoiceConfig(result.language);

      twiml.say(voiceConfig, result.response);

      // Ask if they want to continue
      const gather = twiml.gather({
        input: 'speech',
        action: '/voice/process',
        method: 'POST',
        language: voiceConfig.language,
        speechTimeout: 'auto',
        speechModel: 'phone_call',
        timeout: 3,
      });

      gather.say(
        voiceConfig,
        result.language === 'hi'
          ? 'और कुछ पूछना चाहते हैं?'
          : result.language === 'ta'
          ? 'வேறு ஏதாவது கேட்க விரும்புகிறீர்களா?'
          : result.language === 'te'
          ? 'ఇంకేమైనా అడగాలనుకుంటున్నారా?'
          : 'Anything else you would like to ask?'
      );

      // If no response, thank and hangup
      twiml.say(
        voiceConfig,
        result.language === 'hi'
          ? 'धन्यवाद! आपका दिन शुभ हो।'
          : result.language === 'ta'
          ? 'நன்றி! உங்கள் நாள் இனிதாக இருக்கட்டும்.'
          : result.language === 'te'
          ? 'ధన్యవాదాలు! మీ రోజు శుభంగా ఉండాలి.'
          : 'Thank you! Have a great day.'
      );

      twiml.hangup();
    } else {
      twiml.say(
        {
          voice: 'Google.hi-IN-Standard-A',
          language: 'hi-IN',
        },
        'क्षमा करें, कुछ गड़बड़ हुई। कृपया फिर से कोशिश करें।'
      );
      twiml.hangup();
    }

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('[Twilio] Processing error:', error);

    twiml.say(
      {
        voice: 'Google.hi-IN-Standard-A',
        language: 'hi-IN',
      },
      'क्षमा करें, एक त्रुटि हुई। कृपया बाद में फिर से कॉल करें।'
    );
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
  }
}

/**
 * Handle call status callbacks
 */
export function handleCallStatus(req, res) {
  const callSid = req.body.CallSid;
  const callStatus = req.body.CallStatus;

  console.log(`[Twilio] Call ${callSid} status: ${callStatus}`);

  // Clean up session on call end
  if (callStatus === 'completed' || callStatus === 'failed' || callStatus === 'busy') {
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
 */
export async function testAgent(req, res) {
  try {
    const query = req.query.q || 'मैंने आज 500 रुपए खाने पर खर्च किए';
    const result = await masterAgent.handleQuery(query, 'test-session');

    res.json({
      success: true,
      query,
      result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
