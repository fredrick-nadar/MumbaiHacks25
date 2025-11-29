/**
 * Voice Conversation Model - Store all voice interactions
 */

import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant', 'system']
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  language: {
    type: String,
    enum: ['en', 'hi', 'ta', 'te'],
    default: 'hi'
  },
  
  // Voice-specific metadata
  audioUrl: String,
  transcription: String,
  confidence: Number,
  
  // Agent processing
  agentsInvolved: [String],
  processingTimeMs: Number,
  intent: String
}, { _id: true });

const voiceConversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Call identification
  conversationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  callSid: {
    type: String,
    index: true
  },
  
  // Contact info
  fromNumber: {
    type: String,
    required: true
  },
  toNumber: String,
  
  // Conversation data
  messages: [messageSchema],
  
  // Session metadata
  channel: {
    type: String,
    enum: ['twilio-voice', 'whatsapp', 'chat', 'sms'],
    default: 'twilio-voice'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: Date,
  durationSeconds: Number,
  
  // Analytics
  totalMessages: {
    type: Number,
    default: 0
  },
  queriesResolved: {
    type: Number,
    default: 0
  },
  primaryLanguage: {
    type: String,
    enum: ['en', 'hi', 'ta', 'te'],
    default: 'hi'
  },
  
  // Quality metrics
  userSatisfaction: {
    type: Number,
    min: 1,
    max: 5
  },
  callStatus: {
    type: String,
    enum: ['initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer'],
    default: 'initiated'
  },
  
  // Error tracking
  errors: [{
    timestamp: Date,
    error: String,
    agent: String
  }]
}, {
  timestamps: true
});

// Indexes for efficient querying
voiceConversationSchema.index({ userId: 1, startedAt: -1 });
voiceConversationSchema.index({ conversationId: 1 });
voiceConversationSchema.index({ callSid: 1 });
voiceConversationSchema.index({ fromNumber: 1, startedAt: -1 });

// Methods
voiceConversationSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData);
  this.totalMessages = this.messages.length;
  return this.save();
};

voiceConversationSchema.methods.endConversation = function() {
  this.endedAt = new Date();
  this.durationSeconds = Math.floor((this.endedAt - this.startedAt) / 1000);
  this.callStatus = 'completed';
  return this.save();
};

export default mongoose.model('VoiceConversation', voiceConversationSchema);
