const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  kind: {
    type: String,
    required: true,
    enum: [
      'CIBIL_DROP',
      'SPEND_SPIKE',
      'UTILIZATION_HIGH',
      'FINANCE_SCORE_LOW',
      'INCOME_CHANGE',
      'MANUAL_ALERT'
    ]
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  channels: {
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      messageId: { type: String },
      error: { type: String }
    },
    whatsapp: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      messageId: { type: String },
      error: { type: String }
    },
    call: {
      initiated: { type: Boolean, default: false },
      initiatedAt: { type: Date },
      callSid: { type: String },
      status: { type: String },
      error: { type: String }
    }
  },
  acknowledged: {
    type: Boolean,
    default: false
  },
  acknowledgedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
alertSchema.index({ userId: 1 });
alertSchema.index({ kind: 1 });
alertSchema.index({ severity: 1 });
alertSchema.index({ createdAt: -1 });
alertSchema.index({ userId: 1, createdAt: -1 });

// Static method to create CIBIL drop alert
alertSchema.statics.createCibilDropAlert = async function(userId, currentScore, previousScore, threshold) {
  const alert = new this({
    userId,
    kind: 'CIBIL_DROP',
    severity: currentScore < threshold ? 'HIGH' : 'MEDIUM',
    payload: {
      currentScore,
      previousScore,
      threshold,
      drop: previousScore - currentScore,
      message: `CIBIL score dropped from ${previousScore} to ${currentScore}`
    }
  });
  
  return await alert.save();
};

// Static method to create spend spike alert
alertSchema.statics.createSpendSpikeAlert = async function(userId, currentSpend, averageSpend, percentageIncrease) {
  const alert = new this({
    userId,
    kind: 'SPEND_SPIKE',
    severity: percentageIncrease > 50 ? 'HIGH' : 'MEDIUM',
    payload: {
      currentSpend,
      averageSpend,
      percentageIncrease,
      message: `Spending increased by ${percentageIncrease.toFixed(1)}% (₹${currentSpend} vs avg ₹${averageSpend})`
    }
  });
  
  return await alert.save();
};

// Method to mark channel as sent
alertSchema.methods.markChannelSent = function(channel, messageId, error = null) {
  if (this.channels[channel]) {
    this.channels[channel].sent = !error;
    this.channels[channel].sentAt = new Date();
    if (messageId) this.channels[channel].messageId = messageId;
    if (error) this.channels[channel].error = error;
  }
  return this.save();
};

// Method to get alert message for notifications
alertSchema.methods.getNotificationMessage = function() {
  const { kind, payload, severity } = this;
  
  const severityEmoji = {
    LOW: '🟡',
    MEDIUM: '🟠',
    HIGH: '🔴',
    CRITICAL: '🚨'
  };
  
  const emoji = severityEmoji[severity] || '🔔';
  
  switch (kind) {
    case 'CIBIL_DROP':
      return `${emoji} CIBIL Alert: Your credit score dropped to ${payload.currentScore} (was ${payload.previousScore}). This may affect your loan eligibility.`;
    
    case 'SPEND_SPIKE':
      return `${emoji} Spending Alert: Your expenses increased by ${payload.percentageIncrease.toFixed(1)}% this month (₹${payload.currentSpend}). Review your budget.`;
    
    case 'UTILIZATION_HIGH':
      return `${emoji} Credit Alert: Your credit utilization is ${payload.utilization}%. Keep it below 30% for better credit health.`;
    
    case 'FINANCE_SCORE_LOW':
      return `${emoji} Finance Alert: Your finance score is ${payload.financeScore}. Consider reviewing your financial habits.`;
    
    default:
      return `${emoji} TaxWise Alert: ${payload.message || 'Please check your account for important updates.'}`;
  }
};

// Method to get WhatsApp formatted message
alertSchema.methods.getWhatsAppMessage = function() {
  const baseMessage = this.getNotificationMessage();
  return `*TaxWise Alert*\n\n${baseMessage}\n\n📱 Call us for immediate assistance or reply STOP to opt out.`;
};

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;