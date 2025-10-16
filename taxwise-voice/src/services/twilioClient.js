const twilio = require('twilio');
const config = require('../config/env');

// Initialize Twilio client
const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);

class TwilioService {
  constructor() {
    this.client = client;
    this.fromNumber = config.TWILIO_NUMBER;
    this.whatsappFrom = config.WHATSAPP_FROM;
    this.smsFrom = config.ALERTS_SMS_FROM;
  }

  /**
   * Send SMS message
   * @param {string} to - Recipient phone number in E.164 format
   * @param {string} body - Message body
   * @param {string} from - Sender number (optional)
   * @returns {Promise<Object>} Message object with SID
   */
  async sendSMS(to, body, from = null) {
    try {
      const message = await this.client.messages.create({
        body,
        from: from || this.smsFrom,
        to
      });

      console.log(`✅ SMS sent to ${to}: ${message.sid}`);
      return {
        success: true,
        messageId: message.sid,
        status: message.status,
        to,
        body: body.substring(0, 50) + (body.length > 50 ? '...' : '')
      };
    } catch (error) {
      console.error(`❌ SMS failed to ${to}:`, error.message);
      return {
        success: false,
        error: error.message,
        to,
        body: body.substring(0, 50) + (body.length > 50 ? '...' : '')
      };
    }
  }

  /**
   * Send WhatsApp message
   * @param {string} to - Recipient phone number in E.164 format
   * @param {string} body - Message body
   * @returns {Promise<Object>} Message object with SID
   */
  async sendWhatsApp(to, body) {
    try {
      // Format WhatsApp recipient
      const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      
      const message = await this.client.messages.create({
        body,
        from: this.whatsappFrom,
        to: whatsappTo
      });

      console.log(`✅ WhatsApp sent to ${to}: ${message.sid}`);
      return {
        success: true,
        messageId: message.sid,
        status: message.status,
        to,
        body: body.substring(0, 50) + (body.length > 50 ? '...' : '')
      };
    } catch (error) {
      console.error(`❌ WhatsApp failed to ${to}:`, error.message);
      return {
        success: false,
        error: error.message,
        to,
        body: body.substring(0, 50) + (body.length > 50 ? '...' : '')
      };
    }
  }

  /**
   * Make outbound voice call
   * @param {string} to - Recipient phone number in E.164 format
   * @param {string} url - TwiML URL for call instructions
   * @param {string} statusCallback - Status callback URL
   * @param {Array} statusCallbackEvent - Events to track
   * @returns {Promise<Object>} Call object with SID
   */
  async makeCall(to, url, statusCallback = null, statusCallbackEvent = ['initiated', 'ringing', 'answered', 'completed']) {
    try {
      const callOptions = {
        to,
        from: this.fromNumber,
        url,
        method: 'POST',
        timeout: 30,
        record: false
      };

      if (statusCallback) {
        callOptions.statusCallback = statusCallback;
        callOptions.statusCallbackEvent = statusCallbackEvent;
        callOptions.statusCallbackMethod = 'POST';
      }

      const call = await this.client.calls.create(callOptions);

      console.log(`✅ Call initiated to ${to}: ${call.sid}`);
      return {
        success: true,
        callSid: call.sid,
        status: call.status,
        to,
        from: this.fromNumber
      };
    } catch (error) {
      console.error(`❌ Call failed to ${to}:`, error.message);
      return {
        success: false,
        error: error.message,
        to,
        from: this.fromNumber
      };
    }
  }

  /**
   * Get call status
   * @param {string} callSid - Call SID
   * @returns {Promise<Object>} Call status
   */
  async getCallStatus(callSid) {
    try {
      const call = await this.client.calls(callSid).fetch();
      return {
        success: true,
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime
      };
    } catch (error) {
      console.error(`❌ Failed to get call status for ${callSid}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate TwiML for VAPI bridge
   * @returns {string} TwiML XML
   */
  generateVAPIBridgeTwiML() {
    const twiml = new twilio.twiml.VoiceResponse();

    if (config.VAPI_SIP_URI) {
      // SIP connection method
      const dial = twiml.dial({
        callerId: this.fromNumber,
        timeout: 30,
        record: 'do-not-record'
      });
      dial.sip(config.VAPI_SIP_URI);
      
      console.log('📞 Generated SIP bridge TwiML');
    } else if (config.VAPI_WS_URL) {
      // WebSocket streams method
      const connect = twiml.connect();
      const stream = connect.stream({
        url: config.VAPI_WS_URL
      });
      
      if (config.VAPI_WS_AUTH_HEADER) {
        stream.parameter({
          name: 'auth',
          value: config.VAPI_WS_AUTH_HEADER
        });
      }
      
      console.log('📞 Generated WebSocket bridge TwiML');
    } else {
      // Fallback - play a message
      twiml.say('Sorry, voice agent is temporarily unavailable. Please try again later.');
      console.warn('⚠️ No VAPI configuration found, using fallback TwiML');
    }

    return twiml.toString();
  }

  /**
   * Validate phone number format
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} True if valid E.164 format
   */
  isValidPhoneNumber(phoneNumber) {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Format phone number to E.164
   * @param {string} phoneNumber - Phone number to format
   * @param {string} defaultCountryCode - Default country code (e.g., '+91')
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phoneNumber, defaultCountryCode = '+91') {
    if (!phoneNumber) return null;
    
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // If already starts with +, return as is
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    
    // If starts with country code without +, add +
    if (cleaned.length > 10 && cleaned.startsWith('91')) {
      return '+' + cleaned;
    }
    
    // If 10 digits, assume Indian number
    if (cleaned.length === 10) {
      return defaultCountryCode + cleaned;
    }
    
    // Return original if can't format
    return phoneNumber;
  }
}

module.exports = new TwilioService();