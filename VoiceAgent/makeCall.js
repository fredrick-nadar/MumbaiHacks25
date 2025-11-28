/**
 * Make Call - Test script to make outbound call via Twilio
 */

import twilio from 'twilio';
import { config } from './config/env.js';

const client = twilio(config.twilio.accountSid, config.twilio.authToken);

async function makeCall() {
  try {
    console.log('\n🔔 Initiating call...\n');
    console.log(`From: ${config.twilio.phoneNumber}`);
    console.log(`To: ${config.yourPhoneNumber}`);
    console.log(`Webhook: ${config.ngrokUrl}/voice/incoming\n`);

    if (!config.ngrokUrl || config.ngrokUrl.includes('your-ngrok-url')) {
      console.error('❌ Error: NGROK_URL not set in .env file');
      console.log('\n💡 Steps to fix:');
      console.log('   1. Run: ngrok http 3000');
      console.log('   2. Copy the https URL (e.g., https://abc123.ngrok.io)');
      console.log('   3. Add to .env: NGROK_URL=https://abc123.ngrok.io');
      console.log('   4. Restart server and try again\n');
      process.exit(1);
    }

    const call = await client.calls.create({
      from: config.twilio.phoneNumber,
      to: config.yourPhoneNumber,
      url: `${config.ngrokUrl}/voice/incoming`,
      statusCallback: `${config.ngrokUrl}/voice/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      record: false,
    });

    console.log('✅ Call initiated successfully!');
    console.log(`📞 Call SID: ${call.sid}`);
    console.log(`📊 Status: ${call.status}`);
    console.log(`\n⏳ Calling ${config.yourPhoneNumber}...\n`);
    console.log('💬 When you answer, try saying:');
    console.log('   - "मैंने आज 500 रुपए खाने पर खर्च किए"');
    console.log('   - "Tax कैसे बचाऊं?"');
    console.log('   - "निवेश की सलाह दो"\n');
  } catch (error) {
    console.error('❌ Error making call:', error.message);
    
    if (error.code === 20003) {
      console.log('\n💡 Authentication failed. Check:');
      console.log('   - TWILIO_ACCOUNT_SID in .env');
      console.log('   - TWILIO_AUTH_TOKEN in .env\n');
    } else if (error.code === 21608) {
      console.log('\n💡 Phone number not verified. Check:');
      console.log('   - YOUR_PHONE_NUMBER in .env (must be verified in Twilio)');
      console.log('   - TWILIO_PHONE_NUMBER in .env (must be your Twilio number)\n');
    }
  }
}

// Run the function
makeCall();
