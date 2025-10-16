const express = require('express');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const { GoogleGenerativeAI } = require('@google/generative-ai');
const User = require('../models/User');
const config = require('../config/env');

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

// Store conversation context (in production, use Redis or database)
const conversationContext = new Map();

// Main voice handler - receives calls and starts conversation
router.post('/incoming', async (req, res) => {
  console.log('📞 Incoming call received:', {
    callSid: req.body.CallSid,
    from: req.body.From,
    to: req.body.To,
    timestamp: new Date().toISOString()
  });

  const twiml = new VoiceResponse();
  
  // Initialize conversation context
  const callSid = req.body.CallSid;
  conversationContext.set(callSid, {
    step: 'phone_request',
    userPhone: null,
    userData: null,
    language: 'hindi', // default set to Hindi
    conversationHistory: []
  });

  // Greet the user directly in Hindi and ask for phone number
  const gather = twiml.gather({
    input: 'speech',
    timeout: 10,
    speechTimeout: 'auto',
    action: '/voice/process-speech',
    method: 'POST'
  });

  gather.say({
    voice: 'Polly.Joanna'
  }, 'Namaste! Main aapka TaxWise financial assistant hun. Main aapki financial health, CIBIL score, aur personalized advice mein madad kar sakta hun. Shuru karne ke liye, kripaya apna phone number bataiye.');

  // Fallback if no speech detected
  twiml.say({
    voice: 'Polly.Joanna'
  }, 'Mujhe kuch sunai nahi diya. Jab aap bolne ke liye taiyaar hon tab dubara call kariye.');

  res.type('text/xml');
  res.send(twiml.toString());
});

// Process speech input and generate Gemini responses
router.post('/process-speech', async (req, res) => {
  const callSid = req.body.CallSid;
  const speechResult = req.body.SpeechResult || '';
  const context = conversationContext.get(callSid) || {};
  
  console.log('🗣️ Speech received:', {
    callSid: callSid.substring(-8),
    speech: speechResult,
    step: context.step
  });

  const twiml = new VoiceResponse();

  try {
    let response;
    let nextAction = 'continue';

    // Check if user wants to switch to English at any point
    const speechLower = speechResult.toLowerCase();
    if (speechLower.includes('english') || speechLower.includes('switch to english')) {
      context.language = 'english';
      conversationContext.set(callSid, context);
      response = 'Switching to English. How can I help you with your financial information?';
    } else if (context.step === 'phone_request' && !context.userPhone) {
      // Extract phone number from speech
      const phoneMatch = speechResult.match(/(\+?[\d\s\-\(\)]{10,15})/);
      if (phoneMatch) {
        const phoneNumber = phoneMatch[1].replace(/[\s\-\(\)]/g, '');
        const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
        
        // Look up user in database
        const user = await User.findOne({ phone: formattedPhone });
        
        if (user) {
          context.userPhone = formattedPhone;
          context.userData = user;
          context.step = 'authenticated';
          conversationContext.set(callSid, context);
          
          if (context.language === 'hindi') {
            response = `Bahut achha! Maine aapka account mil gaya, ${user.name}. Aapka CIBIL score ${user.vitals.cibilEstimate} hai, aur credit utilization ${user.vitals.utilization}% hai. Aap kya jaanna chahte hain?`;
          } else {
            response = `Great! I found your account, ${user.name}. Your current CIBIL score is ${user.vitals.cibilEstimate}, and your credit utilization is ${user.vitals.utilization}%. What would you like to know more about?`;
          }
        } else {
          if (context.language === 'hindi') {
            response = "Is phone number se koi account nahi mila. Kripaya apna phone number dobara clearly bataiye.";
          } else {
            response = "I couldn't find an account with that phone number. Could you please repeat your phone number clearly?";
          }
        }
      } else {
        if (context.language === 'hindi') {
          response = "Mujhe aapka phone number samajh mein nahi aaya. Kripaya area code ke saath phone number dobara bataiye.";
        } else {
          response = "I didn't catch your phone number clearly. Please say your phone number again, including the area code.";
        }
      }
    } else if (context.step === 'authenticated') {
      // Use Gemini to generate intelligent responses based on user data and query
      response = await generateGeminiResponse(speechResult, context);
    } else {
      if (context.language === 'hindi') {
        response = "Mujhe samajh mein nahi aaya. Kripaya apna sawal dobara kahiye.";
      } else {
        response = "I'm having trouble understanding. Could you please repeat your question?";
      }
    }

    // Add response to conversation history
    context.conversationHistory.push({
      user: speechResult,
      assistant: response,
      timestamp: new Date()
    });
    conversationContext.set(callSid, context);

    // Create TwiML response with continue listening
    const gather = twiml.gather({
      input: 'speech',
      timeout: 10,
      speechTimeout: 'auto',
      action: '/voice/process-speech',
      method: 'POST'
    });

    gather.say({
      voice: 'Polly.Joanna'
    }, response);

    // Add a way to end the call
    if (speechResult.toLowerCase().includes('goodbye') || speechResult.toLowerCase().includes('end call') || 
        speechResult.toLowerCase().includes('alvida') || speechResult.toLowerCase().includes('samaapt')) {
      const goodbyeMessage = context.language === 'hindi' ? 
        'TaxWise use karne ke liye dhanyawad! Apni financial health ka khyal rakhiye. Alvida!' :
        'Thank you for using TaxWise! Take care of your financial health. Goodbye!';
      
      twiml.say({
        voice: 'Polly.Joanna'
      }, goodbyeMessage);
      twiml.hangup();
      conversationContext.delete(callSid);
    } else {
      // Timeout message
      const timeoutMessage = context.language === 'hindi' ? 
        'Mujhe kuch sunai nahi diya. Aap koi aur sawal puch sakte hain ya alvida kahiye call khatam karne ke liye.' :
        'I didn\'t hear anything. Feel free to ask me another question or say goodbye to end the call.';
      
      twiml.say({
        voice: 'Polly.Joanna'
      }, timeoutMessage);
      twiml.redirect('/voice/process-speech');
    }

  } catch (error) {
    console.error('❌ Error processing speech:', error);
    
    twiml.say({
      voice: 'Polly.Joanna'
    }, 'I\'m experiencing some technical difficulties. Please try calling back in a moment.');
    twiml.hangup();
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// Generate intelligent response using Gemini
async function generateGeminiResponse(userQuery, context) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const userData = context.userData;
    const conversationHistory = context.conversationHistory.slice(-3); // Last 3 exchanges for context
    const isHindi = context.language === 'hindi';
    
    const prompt = isHindi ? 
    `Aap TaxWise ke liye ek helpful financial advisor assistant hain. Aap ${userData.name} ke saath Hindi mein voice conversation kar rahe hain.

USER'S FINANCIAL DATA:
- Naam: ${userData.name}
- Phone: ${userData.phone}
- CIBIL Score: ${userData.vitals.cibilEstimate}
- Credit Utilization: ${userData.vitals.utilization}%
- Monthly Income: ₹${userData.vitals.monthIncome.toLocaleString()}
- Monthly Expenses: ₹${userData.vitals.monthExpense.toLocaleString()}
- Finance Score: ${userData.vitals.financeScore}/100

CONVERSATION HISTORY:
${conversationHistory.map(h => `User: ${h.user}\nAssistant: ${h.assistant}`).join('\n\n')}

CURRENT USER QUERY: "${userQuery}"

INSTRUCTIONS:
1. Unke actual data ke base par helpful, personalized financial advice dein
2. Response conversational rakhen aur 100 words ke under (yeh voice call hai)
3. Encouraging aur supportive rahiye
4. Specific, actionable advice dein
5. Agar aapke paas data nahi hai, politely explain karein ki aap kya data access kar sakte hain
6. Unke actual numbers ko reference karein jab relevant ho
7. SIRF HINDI MEIN JAWAB DEIN - koi English words use na karein except technical terms jaise CIBIL

Hindi mein helpful, conversational response generate karein:` :

    `You are a helpful financial advisor assistant for TaxWise. You are having a voice conversation with ${userData.name}.

USER'S FINANCIAL DATA:
- Name: ${userData.name}
- Phone: ${userData.phone}
- CIBIL Score: ${userData.vitals.cibilEstimate}
- Credit Utilization: ${userData.vitals.utilization}%
- Monthly Income: ₹${userData.vitals.monthIncome.toLocaleString()}
- Monthly Expenses: ₹${userData.vitals.monthExpense.toLocaleString()}
- Finance Score: ${userData.vitals.financeScore}/100

CONVERSATION HISTORY:
${conversationHistory.map(h => `User: ${h.user}\nAssistant: ${h.assistant}`).join('\n\n')}

CURRENT USER QUERY: "${userQuery}"

INSTRUCTIONS:
1. Provide helpful, personalized financial advice based on their actual data
2. Keep responses conversational and under 100 words (this is a voice call)
3. Be encouraging and supportive
4. Offer specific, actionable advice
5. If they ask about data you don't have, politely explain what data you can access
6. Reference their actual numbers when relevant

Generate a helpful, conversational response:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    console.log('🤖 Gemini response generated:', {
      userQuery: userQuery.substring(0, 50) + '...',
      responseLength: text.length
    });
    
    return text;
    
  } catch (error) {
    console.error('❌ Gemini API error:', error);
    
    // Fallback to basic response using user data
    const userData = context.userData;
    const isHindi = context.language === 'hindi';
    
    if (isHindi) {
      return `Main aapki financial information mein madad kar sakta hun. Aapka CIBIL score ${userData.vitals.cibilEstimate} hai, jo ${userData.vitals.cibilEstimate < 650 ? 'sudhar ki zarurat hai' : 'achha hai'}. Aapka credit utilization ${userData.vitals.utilization}% hai. Aap kya specific baat discuss karna chahte hain?`;
    } else {
      return `I can help you with your financial information. Your CIBIL score is ${userData.vitals.cibilEstimate}, which ${userData.vitals.cibilEstimate < 650 ? 'needs improvement' : 'is in good shape'}. Your credit utilization is ${userData.vitals.utilization}%. What specific aspect would you like to discuss?`;
    }
  }
}

// Call status tracking
router.post('/status-callback', (req, res) => {
  const { CallSid, CallStatus, From, To } = req.body;
  
  console.log('📊 Call status update:', {
    callSid: CallSid?.substring(-8),
    status: CallStatus,
    from: From,
    to: To,
    timestamp: new Date().toISOString()
  });
  
  // Clean up conversation context when call ends
  if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'no-answer') {
    conversationContext.delete(CallSid);
    console.log('🧹 Conversation context cleaned up');
  }
  
  res.status(200).send('OK');
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'twilio-gemini-voice',
    timestamp: new Date().toISOString(),
    activeConversations: conversationContext.size
  });
});

module.exports = router;