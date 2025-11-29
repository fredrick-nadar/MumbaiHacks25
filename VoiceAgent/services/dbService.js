/**
 * Database Service - Helper functions for VoiceAgent database operations
 */

import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import TaxProfile from '../models/TaxProfile.js';
import VoiceConversation from '../models/VoiceConversation.js';

/**
 * Find user by phone number
 */
export async function findUserByPhone(phoneNumber) {
  try {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalized = phoneNumber.replace(/[\s-()]/g, '');
    
    const user = await User.findOne({ 
      phone: normalized
    });
    
    return user;
  } catch (error) {
    console.error('[DB] Error finding user by phone:', error);
    return null;
  }
}

/**
 * Create new user (for registration via voice)
 */
export async function createUser(userData) {
  try {
    const user = await User.create({
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      isActive: true,
      createdAt: new Date()
    });
    
    console.log('[DB] User created:', user._id);
    return user;
  } catch (error) {
    console.error('[DB] Error creating user:', error);
    throw error;
  }
}

/**
 * Get user's tax profile for current assessment year
 */
export async function getUserTaxProfile(userId) {
  try {
    const currentYear = new Date().getFullYear();
    const assessmentYear = `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
    
    let taxProfile = await TaxProfile.findOne({
      userId,
      assessmentYear
    });
    
    // Create default profile if doesn't exist
    if (!taxProfile) {
      taxProfile = await TaxProfile.create({
        userId,
        assessmentYear,
        salaryIncome: 0,
        section80C: 0,
        section80D: 0
      });
    }
    
    return taxProfile;
  } catch (error) {
    console.error('[DB] Error getting tax profile:', error);
    return null;
  }
}

/**
 * Get user's recent transactions
 */
export async function getUserTransactions(userId, options = {}) {
  try {
    const {
      limit = 10,
      type = null, // 'credit' or 'debit'
      category = null,
      startDate = null,
      endDate = null
    } = options;
    
    const query = { userId };
    
    if (type) query.type = type;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .limit(limit);
    
    return transactions;
  } catch (error) {
    console.error('[DB] Error getting transactions:', error);
    return [];
  }
}

/**
 * Add a new transaction from voice input
 */
export async function addVoiceTransaction(userId, transactionData, conversationId) {
  try {
    const transaction = await Transaction.create({
      userId,
      date: transactionData.date || new Date(),
      description: transactionData.description,
      amount: transactionData.amount,
      type: transactionData.type, // 'credit' or 'debit'
      category: transactionData.category,
      source: 'voice',
      voiceTranscript: transactionData.originalQuery,
      language: transactionData.language || 'hi',
      conversationId,
      confidence: transactionData.confidence || 1
    });
    
    console.log('[DB] Transaction added:', transaction._id);
    return transaction;
  } catch (error) {
    console.error('[DB] Error adding transaction:', error);
    return null;
  }
}

/**
 * Get spending summary by category
 */
export async function getSpendingSummary(userId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const summary = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'debit',
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]);
    
    return summary;
  } catch (error) {
    console.error('[DB] Error getting spending summary:', error);
    return [];
  }
}

/**
 * Get monthly income/expense summary
 */
export async function getMonthlySummary(userId, month = null, year = null) {
  try {
    const now = new Date();
    const targetMonth = month || now.getMonth();
    const targetYear = year || now.getFullYear();
    
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0);
    
    const summary = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const result = {
      month: targetMonth + 1,
      year: targetYear,
      income: 0,
      expenses: 0,
      netSavings: 0
    };
    
    summary.forEach(item => {
      if (item._id === 'credit') result.income = item.total;
      if (item._id === 'debit') result.expenses = item.total;
    });
    
    result.netSavings = result.income - result.expenses;
    
    return result;
  } catch (error) {
    console.error('[DB] Error getting monthly summary:', error);
    return null;
  }
}

/**
 * Start a new voice conversation
 */
export async function startVoiceConversation(callData) {
  try {
    // Find user by phone number
    const user = await findUserByPhone(callData.fromNumber);
    
    const conversation = await VoiceConversation.create({
      userId: user?._id || null,
      conversationId: callData.conversationId,
      callSid: callData.callSid,
      fromNumber: callData.fromNumber,
      toNumber: callData.toNumber,
      channel: 'twilio-voice',
      startedAt: new Date(),
      callStatus: 'in-progress'
    });
    
    console.log('[DB] Voice conversation started:', conversation._id);
    return conversation;
  } catch (error) {
    console.error('[DB] Error starting conversation:', error);
    return null;
  }
}

/**
 * Add message to conversation
 */
export async function addConversationMessage(conversationId, messageData) {
  try {
    const conversation = await VoiceConversation.findOne({ conversationId });
    
    if (!conversation) {
      console.error('[DB] Conversation not found:', conversationId);
      return null;
    }
    
    await conversation.addMessage({
      role: messageData.role,
      content: messageData.content,
      timestamp: new Date(),
      language: messageData.language,
      transcription: messageData.transcription,
      agentsInvolved: messageData.agentsInvolved || [],
      processingTimeMs: messageData.processingTimeMs,
      intent: messageData.intent
    });
    
    return conversation;
  } catch (error) {
    console.error('[DB] Error adding message:', error);
    return null;
  }
}

/**
 * End voice conversation
 */
export async function endVoiceConversation(conversationId) {
  try {
    const conversation = await VoiceConversation.findOne({ conversationId });
    
    if (!conversation) {
      console.error('[DB] Conversation not found:', conversationId);
      return null;
    }
    
    await conversation.endConversation();
    console.log('[DB] Conversation ended:', conversationId);
    return conversation;
  } catch (error) {
    console.error('[DB] Error ending conversation:', error);
    return null;
  }
}

/**
 * Get conversation history for user
 */
export async function getUserConversations(userId, limit = 10) {
  try {
    const conversations = await VoiceConversation.find({ userId })
      .sort({ startedAt: -1 })
      .limit(limit)
      .select('conversationId startedAt endedAt durationSeconds totalMessages callStatus');
    
    return conversations;
  } catch (error) {
    console.error('[DB] Error getting conversations:', error);
    return [];
  }
}

export default {
  findUserByPhone,
  createUser,
  getUserTaxProfile,
  getUserTransactions,
  addVoiceTransaction,
  getSpendingSummary,
  getMonthlySummary,
  startVoiceConversation,
  addConversationMessage,
  endVoiceConversation,
  getUserConversations
};
