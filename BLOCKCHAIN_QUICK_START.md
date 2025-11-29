# 🚀 QUICK START: Deploy Blockchain Insurance (5 Minutes)

**⚠️ IMPORTANT: Mumbai testnet is DEPRECATED. Use Polygon Amoy or Sepolia instead!**

---

## Option 1: Local Blockchain (Fastest - No Setup Required)

```powershell
# Terminal 1: Start local blockchain
cd D:\Programming\MumbaiHacks25\backend
npx hardhat node

# Keep this running - you'll see 20 test accounts with 10,000 ETH each
```

```powershell
# Terminal 2: Deploy contract
cd D:\Programming\MumbaiHacks25\backend
npx hardhat run scripts/deploy-insurance.js --network localhost
```

**Copy the private key from Terminal 1** (Account #0):
```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**Update `backend/.env`:**
```env
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_RPC_URL=http://localhost:8545
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
INSURANCE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**Start backend:**
```powershell
cd D:\Programming\MumbaiHacks25\backend
npm run dev
```

✅ **Done!** Insurance policies will now be recorded on blockchain!

---

## Option 2: Polygon Amoy Testnet (Real Blockchain)

### Step 1: Get MetaMask Private Key
1. Open MetaMask extension
2. Click account → "Account Details"
3. Click "Show Private Key"
4. Enter password and **copy the key**

### Step 2: Get Free Test MATIC
1. Go to: **https://faucet.polygon.technology/**
2. Select **"Polygon Amoy"** network
3. Paste your wallet address
4. Click "Submit"
5. Wait 1-2 minutes

### Step 3: Add Network to MetaMask
- Network Name: Polygon Amoy
- RPC URL: https://rpc-amoy.polygon.technology
- Chain ID: 80002
- Currency Symbol: MATIC
- Block Explorer: https://amoy.polygonscan.com

### Step 4: Update `.env`
```env
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
BLOCKCHAIN_PRIVATE_KEY=YOUR_METAMASK_PRIVATE_KEY_HERE
```

### Step 5: Deploy
```powershell
cd D:\Programming\MumbaiHacks25\backend
npx hardhat run scripts/deploy-insurance.js --network polygonAmoy
```

You'll see:
```
✅ InsuranceRegistry deployed successfully!
📍 Contract Address: 0x123abc...
🔍 View on Block Explorer:
https://amoy.polygonscan.com/address/0x123abc...
```

### Step 6: Start Backend
```powershell
npm run dev
```

---

## Option 3: Ethereum Sepolia Testnet (Alternative)

### Step 1: Get Free Test ETH
- **Google Cloud Faucet**: https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- **Alchemy Faucet**: https://sepoliafaucet.com/
- **Infura Faucet**: https://www.infura.io/faucet/sepolia

### Step 2: Get Infura API Key (Optional but Recommended)
1. Go to: https://infura.io/
2. Sign up (free)
3. Create new project
4. Copy your API key

### Step 3: Update `.env`
```env
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_API_KEY
BLOCKCHAIN_PRIVATE_KEY=YOUR_METAMASK_PRIVATE_KEY_HERE
```

Or use public RPC (less reliable):
```env
BLOCKCHAIN_RPC_URL=https://rpc.sepolia.org
```

### Step 4: Deploy
```powershell
cd D:\Programming\MumbaiHacks25\backend
npx hardhat run scripts/deploy-insurance.js --network sepolia
```

---

## Test the API

```powershell
# Test creating an insurance policy
POST http://localhost:3001/api/insurance
Authorization: Bearer YOUR_JWT_TOKEN

{
  "policyNumber": "DEMO-001",
  "policyType": "health",
  "provider": "TaxWise Insurance",
  "holderName": "John Doe",
  "coverageAmount": 500000,
  "premiumAmount": 15000,
  "premiumFrequency": "yearly",
  "startDate": "2025-12-01",
  "endDate": "2026-12-01"
}
```

**Response will include:**
```json
{
  "blockchainData": {
    "isOnChain": true,
    "policyHash": "0xabc123...",
    "transactionHash": "0xdef456...",
    "blockNumber": 12345,
    "policyId": "1"
  }
}
```

**View transaction on block explorer:**
- Localhost: Check Terminal 1 output
- Amoy: `https://amoy.polygonscan.com/tx/0xdef456...`
- Sepolia: `https://sepolia.etherscan.io/tx/0xdef456...`

---

## Troubleshooting

### "Insufficient funds for gas"
- **Localhost**: Should never happen (unlimited ETH)
- **Testnet**: Get more tokens from faucet

### "Network connection timeout"
- Check your internet connection
- Try alternative RPC URL
- For Sepolia, use Infura/Alchemy instead of public RPC

### "Nonce too high"
- In MetaMask: Settings → Advanced → Reset Account

### Contract not deploying?
```powershell
npx hardhat clean
npx hardhat compile
npx hardhat run scripts/deploy-insurance.js --network localhost
```

---

## For Demo to Judges

1. **Show contract on block explorer** (if using testnet)
2. **Create policy via Postman/API**
3. **Copy transaction hash from response**
4. **Open transaction on block explorer**
5. **Show:**
   - ✅ Block number
   - ✅ Transaction confirmed
   - ✅ Function called: `registerPolicy`
   - ✅ Gas used
   - ✅ Timestamp

---

## Quick Commands Reference

```powershell
# Compile contracts
npx hardhat compile

# Start local blockchain
npx hardhat node

# Deploy to localhost
npx hardhat run scripts/deploy-insurance.js --network localhost

# Deploy to Polygon Amoy
npx hardhat run scripts/deploy-insurance.js --network polygonAmoy

# Deploy to Sepolia
npx hardhat run scripts/deploy-insurance.js --network sepolia

# Start backend
npm run dev
```

---

✅ **You're ready to demonstrate blockchain insurance integration!**
