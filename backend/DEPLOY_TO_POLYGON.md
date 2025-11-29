# Deploy Insurance Smart Contract to Polygon Testnet

## Quick Steps for Demo

### 1. Get Test MATIC Tokens (FREE)
1. Visit **Polygon Amoy Faucet**: https://faucet.polygon.technology/
2. Select "Polygon Amoy" network
3. Paste your wallet address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
4. Click "Submit" - You'll get 0.5 test MATIC instantly

### 2. Update .env File
```env
# Change these lines in your .env file:
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_RPC_URL=https://rpc-amoy.polygon.technology
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
INSURANCE_CONTRACT_ADDRESS=  # Will be filled after deployment
```

### 3. Deploy Smart Contract
```bash
# In backend directory
npx hardhat run scripts/deploy-insurance.js --network polygonAmoy
```

### 4. Update Backend .env
After deployment, the contract address will be automatically added to your `.env` file.

### 5. Restart Backend
```bash
npm start
```

### 6. Verify on PolygonScan
Visit: https://amoy.polygonscan.com/address/YOUR_CONTRACT_ADDRESS

---

## Alternative: Use Alchemy RPC (Faster & More Reliable)

1. Create free account at https://alchemy.com
2. Create new app for "Polygon Amoy"
3. Copy the RPC URL
4. Update `.env`:
```env
BLOCKCHAIN_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY
```

---

## View Your Transactions
After creating policies, view them on:
- **Amoy PolygonScan**: https://amoy.polygonscan.com/address/YOUR_CONTRACT_ADDRESS
- See all transactions, events, and verified contract code

---

## Current Status
✅ Smart contract compiled
✅ Hardhat config ready for Polygon Amoy
⏳ Get test MATIC from faucet
⏳ Deploy to testnet
⏳ View on block explorer

---

## Cost
- **Deployment**: ~$0 (uses test MATIC)
- **Each policy creation**: ~$0 (test MATIC is free)
- **For judges to verify**: Share PolygonScan link showing real blockchain transactions!
