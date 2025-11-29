/**
 * Call Routes - API endpoints to trigger outbound calls
 */

import express from 'express';
import twilio from 'twilio';
import { config } from '../config/env.js';

const router = express.Router();
const client = twilio(config.twilio.accountSid, config.twilio.authToken);

/**
 * POST /api/call/request
 * Triggers an outbound call to the user
 */
router.post('/request', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    // Use provided phone number or default from config
    const toNumber = phoneNumber || config.yourPhoneNumber;

    if (!toNumber || toNumber === '+1234567890') {
      return res.status(400).json({
        success: false,
        error: 'Phone number not configured. Please provide a valid phone number.',
      });
    }

    if (!config.ngrokUrl || config.ngrokUrl.includes('your-ngrok-url')) {
      return res.status(500).json({
        success: false,
        error: 'Server webhook URL not configured. Please set NGROK_URL in .env',
      });
    }

    console.log(`\n🔔 API Call Request from Frontend`);
    console.log(`From: ${config.twilio.phoneNumber}`);
    console.log(`To: ${toNumber}`);
    console.log(`Webhook: ${config.ngrokUrl}/voice/incoming\n`);

    // Initiate Twilio call
    const call = await client.calls.create({
      from: config.twilio.phoneNumber,
      to: toNumber,
      url: `${config.ngrokUrl}/voice/incoming`,
      statusCallback: `${config.ngrokUrl}/voice/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      record: false,
    });

    console.log('✅ Call initiated successfully via API!');
    console.log(`📞 Call SID: ${call.sid}`);

    res.json({
      success: true,
      message: 'Call initiated successfully',
      callSid: call.sid,
      status: call.status,
      to: toNumber,
      from: config.twilio.phoneNumber,
    });
  } catch (error) {
    console.error('❌ Error initiating call:', error.message);

    let errorMessage = 'Failed to initiate call';
    
    if (error.code === 20003) {
      errorMessage = 'Authentication failed. Check Twilio credentials.';
    } else if (error.code === 21608) {
      errorMessage = 'Phone number not verified in Twilio.';
    } else if (error.code === 21211) {
      errorMessage = 'Invalid phone number format.';
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message,
      code: error.code,
    });
  }
});

/**
 * GET /api/call/status/:callSid
 * Get status of a specific call
 */
router.get('/status/:callSid', async (req, res) => {
  try {
    const { callSid } = req.params;

    const call = await client.calls(callSid).fetch();

    res.json({
      success: true,
      callSid: call.sid,
      status: call.status,
      duration: call.duration,
      from: call.from,
      to: call.to,
      startTime: call.startTime,
      endTime: call.endTime,
    });
  } catch (error) {
    console.error('❌ Error fetching call status:', error.message);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch call status',
      details: error.message,
    });
  }
});

export default router;
