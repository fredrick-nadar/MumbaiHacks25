const mongoose = require('mongoose');

const insurancePolicySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Policy Details
  policyNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  
  policyType: {
    type: String,
    required: true,
    enum: ['health', 'life', 'term', 'vehicle', 'home', 'property', 'travel', 'other'],
    index: true
  },
  
  provider: {
    type: String,
    required: true,
    trim: true
  },
  
  holderName: {
    type: String,
    required: true,
    trim: true
  },
  
  coverageAmount: {
    type: Number,
    required: true
  },
  
  premiumAmount: {
    type: Number,
    required: true
  },
  
  premiumFrequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'],
    default: 'yearly'
  },
  
  startDate: {
    type: Date,
    required: true
  },
  
  endDate: {
    type: Date,
    required: true
  },
  
  status: {
    type: String,
    enum: ['active', 'lapsed', 'expired', 'cancelled'],
    default: 'active',
    index: true
  },
  
  // Blockchain Integration
  blockchainVerified: {
    type: Boolean,
    default: false
  },
  
  blockchainData: {
    policyHash: String,
    policyId: String, // On-chain policy ID
    transactionHash: String,
    blockNumber: Number,
    registeredAt: Date,
    isOnChain: {
      type: Boolean,
      default: false
    },
    verificationUrl: String // Block explorer link
  },
  
  // Premium Payment History
  premiumPayments: [{
    paymentDate: Date,
    amount: Number,
    paymentMethod: String,
    transactionId: String,
    status: {
      type: String,
      enum: ['paid', 'pending', 'failed'],
      default: 'paid'
    },
    // Blockchain payment record
    blockchainPayment: {
      paymentHash: String,
      transactionHash: String,
      blockNumber: Number,
      isOnChain: Boolean
    }
  }],
  
  // Claims History
  claims: [{
    claimId: String,
    claimDate: Date,
    claimAmount: Number,
    claimType: String,
    description: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paid'],
      default: 'pending'
    },
    approvedAmount: Number,
    processedDate: Date,
    // Blockchain claim record
    blockchainClaim: {
      claimHash: String,
      onChainClaimId: String,
      transactionHash: String,
      blockNumber: Number,
      isOnChain: Boolean
    }
  }],
  
  // Tax Deduction Eligibility
  taxBenefit: {
    eligible: {
      type: Boolean,
      default: true
    },
    section: {
      type: String,
      enum: ['80C', '80D', '80CCC', 'other'],
      default: '80D'
    },
    maxDeduction: Number,
    claimedAmount: {
      type: Number,
      default: 0
    }
  },
  
  // Documents
  documents: [{
    type: {
      type: String,
      enum: ['policy_copy', 'payment_receipt', 'claim_form', 'medical_report', 'other']
    },
    fileName: String,
    fileUrl: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    // Document hash on blockchain for verification
    documentHash: String,
    blockchainVerified: Boolean
  }],
  
  // Beneficiaries
  beneficiaries: [{
    name: String,
    relationship: String,
    percentage: Number
  }],
  
  // Additional Notes
  notes: String,
  
  // Metadata
  createdBy: String,
  lastModifiedBy: String

}, {
  timestamps: true
});

// Indexes for better query performance
insurancePolicySchema.index({ userId: 1, status: 1 });
insurancePolicySchema.index({ userId: 1, policyType: 1 });
insurancePolicySchema.index({ 'blockchainData.policyId': 1 });
insurancePolicySchema.index({ startDate: 1, endDate: 1 });

// Virtual for checking if policy is expiring soon (within 30 days)
insurancePolicySchema.virtual('isExpiringSoon').get(function() {
  if (!this.endDate) return false;
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return this.endDate <= thirtyDaysFromNow && this.status === 'active';
});

// Virtual for total premiums paid
insurancePolicySchema.virtual('totalPremiumsPaid').get(function() {
  return this.premiumPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
});

// Virtual for total claims amount
insurancePolicySchema.virtual('totalClaimsAmount').get(function() {
  return this.claims
    .filter(c => c.status === 'approved' || c.status === 'paid')
    .reduce((sum, c) => sum + (c.approvedAmount || c.claimAmount), 0);
});

// Method to check if policy is active
insurancePolicySchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.startDate <= now && 
         this.endDate >= now;
};

// Method to get next premium due date
insurancePolicySchema.methods.getNextPremiumDueDate = function() {
  if (this.premiumPayments.length === 0) {
    return this.startDate;
  }
  
  const lastPayment = this.premiumPayments
    .sort((a, b) => b.paymentDate - a.paymentDate)[0];
  
  const nextDue = new Date(lastPayment.paymentDate);
  
  switch(this.premiumFrequency) {
    case 'monthly':
      nextDue.setMonth(nextDue.getMonth() + 1);
      break;
    case 'quarterly':
      nextDue.setMonth(nextDue.getMonth() + 3);
      break;
    case 'half-yearly':
      nextDue.setMonth(nextDue.getMonth() + 6);
      break;
    case 'yearly':
      nextDue.setFullYear(nextDue.getFullYear() + 1);
      break;
  }
  
  return nextDue;
};

// Static method to get expiring policies
insurancePolicySchema.statics.getExpiringPolicies = function(userId, days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    userId,
    status: 'active',
    endDate: { $lte: futureDate, $gte: new Date() }
  });
};

// Static method to get policies with pending claims
insurancePolicySchema.statics.getPoliciesWithPendingClaims = function(userId) {
  return this.find({
    userId,
    'claims.status': 'pending'
  });
};

module.exports = mongoose.model('InsurancePolicy', insurancePolicySchema);
