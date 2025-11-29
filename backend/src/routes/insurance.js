const express = require('express');
const router = express.Router();
const { InsurancePolicy } = require('../models');
const insuranceBlockchain = require('../services/blockchain/insuranceBlockchain');

/**
 * @route   GET /api/insurance
 * @desc    Get all insurance policies for logged-in user
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const policies = await InsurancePolicy.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      status: 'success',
      data: {
        policies,
        count: policies.length
      }
    });
  } catch (error) {
    console.error('Error fetching insurance policies:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch insurance policies',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/insurance/:id
 * @desc    Get single insurance policy
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!policy) {
      return res.status(404).json({
        status: 'error',
        message: 'Insurance policy not found'
      });
    }

    res.json({
      status: 'success',
      data: { policy }
    });
  } catch (error) {
    console.error('Error fetching insurance policy:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch insurance policy',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/insurance
 * @desc    Create new insurance policy with blockchain registration
 * @access  Private
 */
router.post('/', async (req, res) => {
  try {
    const {
      policyNumber,
      policyType,
      provider,
      holderName,
      coverageAmount,
      premiumAmount,
      premiumFrequency,
      startDate,
      endDate,
      taxBenefit,
      beneficiaries
    } = req.body;

    // Validate required fields
    if (!policyNumber || !policyType || !provider || !coverageAmount || !premiumAmount) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields'
      });
    }

    // Check if policy already exists
    const existingPolicy = await InsurancePolicy.findOne({ policyNumber });
    if (existingPolicy) {
      return res.status(400).json({
        status: 'error',
        message: 'Policy with this number already exists'
      });
    }

    // Create policy data for blockchain
    const policyData = {
      policyNumber,
      holderName: holderName || req.user.name,
      holderAadhaar: req.user.aadhaarRefHash || '',
      insuranceType: policyType,
      provider,
      startDate,
      endDate,
      premium: premiumAmount,
      coverageAmount
    };

    // Register on blockchain
    console.log('🔗 Registering insurance policy on blockchain...');
    const blockchainResult = await insuranceBlockchain.registerPolicy(policyData);

    // Create policy in database
    const newPolicy = new InsurancePolicy({
      userId: req.user._id,
      policyNumber,
      policyType,
      provider,
      holderName: holderName || req.user.name,
      coverageAmount,
      premiumAmount,
      premiumFrequency: premiumFrequency || 'yearly',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      taxBenefit: taxBenefit || {
        eligible: policyType === 'health' || policyType === 'life',
        section: policyType === 'health' ? '80D' : '80C'
      },
      beneficiaries: beneficiaries || [],
      blockchainVerified: blockchainResult.onChain || false,
      blockchainData: {
        policyHash: blockchainResult.policyHash,
        policyId: blockchainResult.policyId,
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber,
        registeredAt: blockchainResult.timestamp,
        isOnChain: blockchainResult.onChain || false,
        verificationUrl: blockchainResult.transactionHash 
          ? `https://etherscan.io/tx/${blockchainResult.transactionHash}`
          : null
      }
    });

    await newPolicy.save();

    console.log('✅ Insurance policy created:', {
      policyId: newPolicy._id,
      onChain: blockchainResult.onChain,
      blockchainPolicyId: blockchainResult.policyId
    });

    res.status(201).json({
      status: 'success',
      message: 'Insurance policy created successfully',
      data: {
        policy: newPolicy,
        blockchain: {
          verified: blockchainResult.onChain || false,
          transactionHash: blockchainResult.transactionHash,
          policyId: blockchainResult.policyId
        }
      }
    });

  } catch (error) {
    console.error('Error creating insurance policy:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create insurance policy',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/insurance/:id/payment
 * @desc    Record premium payment with blockchain verification
 * @access  Private
 */
router.post('/:id/payment', async (req, res) => {
  try {
    const { amount, paymentDate, paymentMethod, transactionId } = req.body;

    const policy = await InsurancePolicy.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!policy) {
      return res.status(404).json({
        status: 'error',
        message: 'Insurance policy not found'
      });
    }

    // Prepare payment data for blockchain
    const paymentData = {
      policyNumber: policy.policyNumber,
      amount,
      date: paymentDate || new Date(),
      transactionId: transactionId || `PAY-${Date.now()}`
    };

    // Record payment on blockchain
    let blockchainResult;
    
    // Check if policy has valid blockchain policyId
    if (!policy.blockchainData || !policy.blockchainData.policyId) {
      console.log('⚠️  Policy does not have blockchain policyId, skipping blockchain payment record');
      blockchainResult = {
        success: true,
        offChain: true,
        paymentHash: null,
        message: 'Policy not registered on blockchain'
      };
    } else {
      blockchainResult = await insuranceBlockchain.recordPremiumPayment(
        policy.blockchainData.policyId,
        paymentData
      );
    }

    // Add payment to policy
    policy.premiumPayments.push({
      paymentDate: new Date(paymentDate || Date.now()),
      amount,
      paymentMethod,
      transactionId: paymentData.transactionId,
      status: 'paid',
      blockchainPayment: {
        paymentHash: blockchainResult.paymentHash,
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber,
        isOnChain: blockchainResult.onChain || false
      }
    });

    await policy.save();

    console.log('✅ Premium payment recorded:', {
      policyId: policy._id,
      amount,
      onChain: blockchainResult.onChain
    });

    res.json({
      status: 'success',
      message: 'Premium payment recorded successfully',
      data: {
        payment: policy.premiumPayments[policy.premiumPayments.length - 1],
        blockchain: {
          verified: blockchainResult.onChain || false,
          transactionHash: blockchainResult.transactionHash
        }
      }
    });

  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to record payment',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/insurance/:id/claim
 * @desc    Submit insurance claim with blockchain tracking
 * @access  Private
 */
router.post('/:id/claim', async (req, res) => {
  try {
    const { claimAmount, claimType, description } = req.body;

    const policy = await InsurancePolicy.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!policy) {
      return res.status(404).json({
        status: 'error',
        message: 'Insurance policy not found'
      });
    }

    if (!policy.isActive()) {
      return res.status(400).json({
        status: 'error',
        message: 'Policy is not active'
      });
    }

    if (claimAmount > policy.coverageAmount) {
      return res.status(400).json({
        status: 'error',
        message: 'Claim amount exceeds coverage'
      });
    }

    // Prepare claim data for blockchain
    const claimData = {
      policyNumber: policy.policyNumber,
      claimType,
      amount: claimAmount,
      date: new Date(),
      description,
      status: 'pending'
    };

    // Submit claim on blockchain
    const blockchainResult = await insuranceBlockchain.submitClaim(
      policy.blockchainData.policyId,
      claimData
    );

    // Add claim to policy
    const newClaim = {
      claimId: `CLM-${Date.now()}`,
      claimDate: new Date(),
      claimAmount,
      claimType,
      description,
      status: 'pending',
      blockchainClaim: {
        claimHash: blockchainResult.claimHash,
        onChainClaimId: blockchainResult.claimId,
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber,
        isOnChain: blockchainResult.onChain || false
      }
    };

    policy.claims.push(newClaim);
    await policy.save();

    console.log('✅ Insurance claim submitted:', {
      policyId: policy._id,
      claimId: newClaim.claimId,
      onChain: blockchainResult.onChain
    });

    res.status(201).json({
      status: 'success',
      message: 'Insurance claim submitted successfully',
      data: {
        claim: newClaim,
        blockchain: {
          verified: blockchainResult.onChain || false,
          transactionHash: blockchainResult.transactionHash,
          claimId: blockchainResult.claimId
        }
      }
    });

  } catch (error) {
    console.error('Error submitting claim:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit claim',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/insurance/:id/verify
 * @desc    Verify insurance policy on blockchain
 * @access  Private
 */
router.get('/:id/verify', async (req, res) => {
  try {
    const policy = await InsurancePolicy.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!policy) {
      return res.status(404).json({
        status: 'error',
        message: 'Insurance policy not found'
      });
    }

    if (!policy.blockchainData.policyHash) {
      return res.status(400).json({
        status: 'error',
        message: 'Policy not registered on blockchain'
      });
    }

    // Verify on blockchain
    const verification = await insuranceBlockchain.verifyPolicy(
      policy.blockchainData.policyHash
    );

    res.json({
      status: 'success',
      data: {
        verified: verification.verified,
        onChain: verification.onChain,
        policyDetails: verification.verified ? {
          policyId: verification.policyId,
          policyNumber: verification.policyNumber,
          premium: verification.premium
        } : null,
        localPolicy: {
          policyNumber: policy.policyNumber,
          premium: policy.premiumAmount,
          blockchainRegistered: policy.blockchainData.isOnChain
        }
      }
    });

  } catch (error) {
    console.error('Error verifying policy:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify policy',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/insurance/summary/overview
 * @desc    Get insurance overview with blockchain stats
 * @access  Private
 */
router.get('/summary/overview', async (req, res) => {
  try {
    const policies = await InsurancePolicy.find({ userId: req.user._id });

    const overview = {
      totalPolicies: policies.length,
      activePolicies: policies.filter(p => p.status === 'active').length,
      totalCoverage: policies
        .filter(p => p.status === 'active')
        .reduce((sum, p) => sum + p.coverageAmount, 0),
      totalPremiumsPaid: policies.reduce((sum, p) => 
        sum + p.premiumPayments
          .filter(payment => payment.status === 'paid')
          .reduce((pSum, payment) => pSum + payment.amount, 0), 0
      ),
      totalClaimsAmount: policies.reduce((sum, p) =>
        sum + p.claims
          .filter(c => c.status === 'approved' || c.status === 'paid')
          .reduce((cSum, c) => cSum + (c.approvedAmount || c.claimAmount), 0), 0
      ),
      pendingClaims: policies.reduce((sum, p) =>
        sum + p.claims.filter(c => c.status === 'pending').length, 0
      ),
      blockchain: {
        policiesOnChain: policies.filter(p => p.blockchainData?.isOnChain).length,
        verifiedPolicies: policies.filter(p => p.blockchainVerified).length,
        totalOnChainRecords: policies.reduce((sum, p) => {
          let count = p.blockchainData?.isOnChain ? 1 : 0;
          count += p.premiumPayments.filter(pay => pay.blockchainPayment?.isOnChain).length;
          count += p.claims.filter(c => c.blockchainClaim?.isOnChain).length;
          return sum + count;
        }, 0)
      },
      expiringPolicies: await InsurancePolicy.getExpiringPolicies(req.user._id, 30)
    };

    res.json({
      status: 'success',
      data: overview
    });

  } catch (error) {
    console.error('Error fetching insurance overview:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch insurance overview',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/insurance/blockchain/health
 * @desc    Check blockchain connectivity health
 * @access  Private
 */
router.get('/blockchain/health', async (req, res) => {
  try {
    const health = await insuranceBlockchain.healthCheck();
    
    res.json({
      status: 'success',
      data: health
    });

  } catch (error) {
    console.error('Error checking blockchain health:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check blockchain health',
      error: error.message
    });
  }
});

module.exports = router;
