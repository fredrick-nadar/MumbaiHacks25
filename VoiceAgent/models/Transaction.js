/**
 * Transaction Model - For expenses and income tracking
 */

import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['credit', 'debit'],
    index: true
  },
  category: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  patternType: String,
  isRecurring: {
    type: Boolean,
    default: false
  },
  notes: String,
  account: String,
  balance: Number,
  
  // Voice Agent specific fields
  source: {
    type: String,
    enum: ['manual', 'voice', 'ai', 'upload'],
    default: 'manual'
  },
  voiceTranscript: String, // Original voice input
  language: {
    type: String,
    enum: ['en', 'hi', 'ta', 'te'],
    default: 'en'
  },
  conversationId: String, // Link to AI conversation
  
  rawDescription: String,
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1
  }
}, {
  timestamps: true
});

// Indexes for voice agent queries
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ conversationId: 1 });

export default mongoose.model('Transaction', transactionSchema);
