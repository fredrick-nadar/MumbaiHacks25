# 🔗 Blockchain Insurance Integration - Setup Guide

## Overview
TaxWise now includes blockchain-powered insurance policy management with:
- ✅ Immutable policy registration on blockchain
- ✅ Premium payment tracking
- ✅ Claims submission and verification
- ✅ Document hash verification
- ✅ Tax deduction eligibility tracking

---

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
cd backend
npm install ethers hardhat @openzeppelin/contracts
```

### 2. Environment Configuration

Add these variables to `backend/.env`:

```env
# Blockchain Configuration
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_RPC_URL=http://localhost:8545
BLOCKCHAIN_PRIVATE_KEY=your_private_key_here
INSURANCE_CONTRACT_ADDRESS=

# For testnet (Sepolia/Goerli)
# BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# For mainnet (production only)
# BLOCKCHAIN_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
```

### 3. Deploy Smart Contract (Optional - for blockchain integration)

If you want blockchain verification (optional feature):

```powershell
cd backend
npx hardhat node  # Start local blockchain
```

In another terminal:
```powershell
npx hardhat run scripts/deploy-insurance.js --network localhost
```

Update `INSURANCE_CONTRACT_ADDRESS` in `.env` with the deployed address.

---

## 📋 Features

### 1. **Policy Management**
- Create insurance policies (Health, Life, Term, Vehicle, Home, Travel)
- Track premium payments
- Monitor expiry dates
- Blockchain-verified policy registration

### 2. **Claims Processing**
- Submit claims with blockchain tracking
- View claim status
- Immutable claim history
- Fraud prevention through blockchain verification

### 3. **Tax Benefits**
- Automatic Section 80C/80D identification
- Premium deduction tracking
- Tax-saving recommendations

### 4. **Blockchain Verification**
- Every policy gets a unique blockchain hash
- Premium payments recorded on-chain
- Claims tracked immutably
- Verifiable proof of insurance

---

## 🔌 API Endpoints

### Insurance Policies

#### Create New Policy
```http
POST /api/insurance
Authorization: Bearer <token>
Content-Type: application/json

{
  "policyNumber": "POL-2025-001",
  "policyType": "health",
  "provider": "HDFC Life",
  "holderName": "John Doe",
  "coverageAmount": 500000,
  "premiumAmount": 15000,
  "premiumFrequency": "yearly",
  "startDate": "2025-01-01",
  "endDate": "2026-01-01",
  "taxBenefit": {
    "eligible": true,
    "section": "80D"
  }
}
```

#### Get All Policies
```http
GET /api/insurance
Authorization: Bearer <token>
```

#### Record Premium Payment
```http
POST /api/insurance/:policyId/payment
Authorization: Bearer <token>

{
  "amount": 15000,
  "paymentDate": "2025-11-29",
  "paymentMethod": "UPI",
  "transactionId": "TXN123456"
}
```

#### Submit Claim
```http
POST /api/insurance/:policyId/claim
Authorization: Bearer <token>

{
  "claimAmount": 50000,
  "claimType": "hospitalization",
  "description": "Emergency surgery"
}
```

#### Verify Policy on Blockchain
```http
GET /api/insurance/:policyId/verify
Authorization: Bearer <token>
```

#### Get Insurance Overview
```http
GET /api/insurance/summary/overview
Authorization: Bearer <token>
```

#### Check Blockchain Health
```http
GET /api/insurance/blockchain/health
Authorization: Bearer <token>
```

---

## 🎯 How It Works

### Without Blockchain (Default)
- Policies stored in MongoDB
- Hashes generated locally
- Full functionality without blockchain costs
- Perfect for testing and development

### With Blockchain (Optional)
1. **Policy Registration**: Hash stored on Ethereum/Polygon
2. **Premium Payments**: Each payment gets blockchain timestamp
3. **Claims**: Immutable claim records on-chain
4. **Verification**: Anyone can verify policy authenticity

---

## 🧪 Testing

### 1. Test Without Blockchain
```powershell
# Keep BLOCKCHAIN_ENABLED=false or omit it
cd backend
npm run dev
```

### 2. Test API Endpoints
```powershell
# Create a policy
curl -X POST http://localhost:3001/api/insurance \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "policyNumber": "TEST-001",
    "policyType": "health",
    "provider": "Test Insurance",
    "coverageAmount": 100000,
    "premiumAmount": 5000,
    "startDate": "2025-01-01",
    "endDate": "2026-01-01"
  }'
```

---

## 💡 Integration with Existing Features

### 1. **Tax Calculations**
- Insurance premiums automatically detected
- Section 80C/80D deductions applied
- Premium payments tracked for tax filing

### 2. **Transaction Categorization**
- Insurance payments auto-categorized
- Premium history linked to policies
- Claim amounts tracked

### 3. **Dashboard Integration**
- Insurance overview in main dashboard
- Expiring policies alerts
- Pending claims notifications

---

## 🔐 Security Features

1. **Blockchain Immutability**: Once recorded, cannot be altered
2. **Hash Verification**: Documents verified through cryptographic hashes
3. **Audit Trail**: Complete history of all policy changes
4. **Fraud Prevention**: Duplicate policies detected
5. **Privacy**: Sensitive data never stored on blockchain (only hashes)

---

## 🌐 Network Options

### Local Development (Hardhat)
```env
BLOCKCHAIN_RPC_URL=http://localhost:8545
```
Free, fast, for testing only

### Polygon Mumbai Testnet (Free)
```env
BLOCKCHAIN_RPC_URL=https://rpc-mumbai.maticvigil.com
```
Real testnet, free MATIC from faucet

### Polygon Mainnet (Production)
```env
BLOCKCHAIN_RPC_URL=https://polygon-rpc.com
```
Low gas fees (~$0.01 per transaction)

### Ethereum Mainnet (Premium)
```env
BLOCKCHAIN_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
```
Higher security, higher costs (~$5-50 per transaction)

---

## 📊 Database Schema

### InsurancePolicy Model
- Policy details (number, type, provider, amounts)
- Blockchain data (hash, transaction, block number)
- Premium payment history (with blockchain tracking)
- Claims history (with blockchain verification)
- Tax benefit information
- Document hashes
- Beneficiary details

---

## 🚧 Troubleshooting

### "Blockchain disabled" in responses
✅ This is normal if `BLOCKCHAIN_ENABLED=false`
- System works perfectly without blockchain
- All features available, hashes stored locally

### Smart contract errors
- Ensure contract is deployed: check `INSURANCE_CONTRACT_ADDRESS`
- Verify RPC URL is correct
- Check private key has funds for gas

### Transaction failures
- Verify wallet has sufficient balance
- Check network congestion
- Reduce gas limit if needed

---

## 📈 Future Enhancements

- [ ] Multi-signature claims approval
- [ ] Decentralized claim arbitration
- [ ] NFT-based policy ownership
- [ ] Cross-chain insurance portability
- [ ] Smart contract-based automatic payouts
- [ ] Integration with DeFi protocols

---

## 🆘 Need Help?

- Check logs: backend console shows blockchain activity
- Test blockchain health: `GET /api/insurance/blockchain/health`
- Verify contract deployment: Check block explorer
- Local testing: Use Hardhat network first

---

## 📝 Notes

- Blockchain is **optional** - system works great without it
- Start with local testing before using testnets
- Use Polygon for production (much cheaper than Ethereum)
- Keep private keys secure - NEVER commit to git
- Document hashes provide verification without exposing data

---

✅ **Your insurance system is now blockchain-ready!**
