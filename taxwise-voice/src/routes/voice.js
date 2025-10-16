const express = require('express');
const User = require('../models/User');
const twilioService = require('../services/twilioClient');
const config = require('../config/env');

const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'TaxWise Voice System',
    timestamp: new Date().toISOString()
  });
});

/**
 * Incoming call webhook from Twilio
 * Returns TwiML to bridge call to VAPI agent
 */
router.post('/voice/incoming', (req, res) => {
  try {
    console.log('📞 Incoming call received:', {
      CallSid: req.body.CallSid,
      From: req.body.From,
      To: req.body.To,
      CallStatus: req.body.CallStatus
    });

    const twiml = twilioService.generateVAPIBridgeTwiML();
    
    res.type('text/xml');
    res.send(twiml);
    
    console.log('✅ Bridging incoming call to VAPI agent');
  } catch (error) {
    console.error('❌ Error handling incoming call:', error);
    
    // Fallback TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, our voice assistant is temporarily unavailable. Please try again later or contact support.</Say>
  <Hangup/>
</Response>`;
    
    res.type('text/xml');
    res.send(twiml);
  }
});

/**
 * Bridge to VAPI endpoint (used for outbound calls)
 * Returns same TwiML as incoming call handler
 */
router.post('/voice/bridge-to-vapi', (req, res) => {
  try {
    console.log('🔗 Bridge to VAPI requested:', {
      CallSid: req.body.CallSid,
      From: req.body.From,
      To: req.body.To
    });

    const twiml = twilioService.generateVAPIBridgeTwiML();
    
    res.type('text/xml');
    res.send(twiml);
    
    console.log('✅ Generated VAPI bridge TwiML for outbound call');
  } catch (error) {
    console.error('❌ Error generating bridge TwiML:', error);
    
    // Fallback TwiML
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, there was an error connecting to our voice assistant.</Say>
  <Hangup/>
</Response>`;
    
    res.type('text/xml');
    res.send(twiml);
  }
});

/**
 * Call-me endpoint - initiate outbound call to user
 * Query params: userId (required)
 */
router.post('/voice/call-me', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId parameter is required'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Rate limiting check
    if (!user.canBeCalled(config.CALL_ME_RATE_LIMIT_MIN)) {
      const timeRemaining = config.CALL_ME_RATE_LIMIT_MIN - Math.floor((new Date() - user.lastCallAt) / (1000 * 60));
      return res.status(429).json({
        success: false,
        error: `Rate limited. Please wait ${timeRemaining} more minutes before requesting another call.`,
        timeRemaining
      });
    }

    // Validate phone number
    if (!twilioService.isValidPhoneNumber(user.phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
    }

    // Initiate call
    const bridgeUrl = `${config.BASE_URL}/voice/bridge-to-vapi`;
    const statusCallbackUrl = `${config.BASE_URL}/voice/status-callback`;
    
    const callResult = await twilioService.makeCall(
      user.phone,
      bridgeUrl,
      statusCallbackUrl,
      ['initiated', 'ringing', 'answered', 'completed']
    );

    if (callResult.success) {
      // Update user's last call time
      user.lastCallAt = new Date();
      await user.save();

      console.log(`✅ Call initiated for user ${user.name} (${user.phone}): ${callResult.callSid}`);
      
      res.json({
        success: true,
        callSid: callResult.callSid,
        message: `Call initiated to ${user.name}`,
        user: {
          id: user._id,
          name: user.name,
          phone: user.phoneFormatted
        }
      });
    } else {
      console.error(`❌ Failed to initiate call for user ${user.name}:`, callResult.error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to initiate call',
        details: callResult.error
      });
    }

  } catch (error) {
    console.error('❌ Error in call-me endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: config.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Call status callback from Twilio
 * Logs call lifecycle events
 */
router.post('/voice/status-callback', (req, res) => {
  try {
    const {
      CallSid,
      CallStatus,
      From,
      To,
      CallDuration,
      RecordingUrl,
      Timestamp
    } = req.body;

    console.log(`📞 Call Status Update:`, {
      CallSid,
      CallStatus,
      From: From ? From.substring(0, 8) + '***' : 'Unknown', // Mask phone for privacy
      To: To ? To.substring(0, 8) + '***' : 'Unknown',
      CallDuration,
      Timestamp
    });

    // Log important status changes
    switch (CallStatus) {
      case 'initiated':
        console.log(`🟡 Call ${CallSid} initiated`);
        break;
      case 'ringing':
        console.log(`🔔 Call ${CallSid} ringing`);
        break;
      case 'answered':
        console.log(`🟢 Call ${CallSid} answered`);
        break;
      case 'completed':
        console.log(`✅ Call ${CallSid} completed (Duration: ${CallDuration}s)`);
        break;
      case 'busy':
        console.log(`📵 Call ${CallSid} busy`);
        break;
      case 'no-answer':
        console.log(`📞 Call ${CallSid} no answer`);
        break;
      case 'failed':
        console.log(`❌ Call ${CallSid} failed`);
        break;
      case 'canceled':
        console.log(`🚫 Call ${CallSid} canceled`);
        break;
      default:
        console.log(`📞 Call ${CallSid} status: ${CallStatus}`);
    }

    // Always respond with 200 to acknowledge receipt
    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Error processing status callback:', error);
    res.status(200).send('ERROR'); // Still return 200 to Twilio
  }
});

/**
 * Test endpoint to validate TwiML generation
 */
router.get('/voice/test-twiml', (req, res) => {
  try {
    const twiml = twilioService.generateVAPIBridgeTwiML();
    
    res.type('text/xml');
    res.send(twiml);
    
    console.log('🧪 Test TwiML generated successfully');
  } catch (error) {
    console.error('❌ Error generating test TwiML:', error);
    res.status(500).json({ error: 'Failed to generate TwiML' });
  }
});

/**
 * List recent calls for debugging
 */
router.get('/voice/recent-calls', async (req, res) => {
  try {
    // This would typically require admin authentication
    const limit = parseInt(req.query.limit) || 10;
    
    // Note: In production, you'd fetch from Twilio API or your own call logs
    res.json({
      message: 'Recent calls endpoint - would show call history',
      note: 'This endpoint should be secured with admin authentication in production',
      limit
    });
    
  } catch (error) {
    console.error('❌ Error fetching recent calls:', error);
    res.status(500).json({ error: 'Failed to fetch recent calls' });
  }
});

module.exports = router;