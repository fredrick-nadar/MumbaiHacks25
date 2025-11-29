// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title InsuranceRegistry
 * @dev Smart contract for decentralized insurance policy and claims management
 */
contract InsuranceRegistry {
    
    // Structs
    struct Policy {
        uint256 id;
        bytes32 policyHash;
        string policyNumber;
        address holder;
        uint256 premium;
        uint256 coverageAmount;
        uint256 registeredAt;
        bool isActive;
    }
    
    struct PremiumPayment {
        uint256 policyId;
        bytes32 paymentHash;
        uint256 amount;
        uint256 paidAt;
    }
    
    struct Claim {
        uint256 id;
        uint256 policyId;
        bytes32 claimHash;
        uint256 amount;
        string status; // pending, approved, rejected, paid
        uint256 submittedAt;
        uint256 processedAt;
    }
    
    // State variables
    uint256 public policyCounter;
    uint256 public claimCounter;
    
    mapping(uint256 => Policy) public policies;
    mapping(bytes32 => uint256) public policyHashToId;
    mapping(uint256 => PremiumPayment[]) public policyPayments;
    mapping(uint256 => Claim) public claims;
    mapping(uint256 => uint256[]) public policyClaims; // policyId => claimIds[]
    
    // Events
    event PolicyRegistered(
        uint256 indexed policyId,
        bytes32 indexed policyHash,
        string policyNumber,
        address holder,
        uint256 premium,
        uint256 coverageAmount
    );
    
    event PremiumPaid(
        uint256 indexed policyId,
        bytes32 indexed paymentHash,
        uint256 amount,
        uint256 timestamp
    );
    
    event ClaimSubmitted(
        uint256 indexed claimId,
        uint256 indexed policyId,
        bytes32 claimHash,
        uint256 amount,
        string status
    );
    
    event ClaimProcessed(
        uint256 indexed claimId,
        uint256 indexed policyId,
        string status,
        uint256 timestamp
    );
    
    // Modifiers
    modifier policyExists(uint256 _policyId) {
        require(_policyId > 0 && _policyId <= policyCounter, "Policy does not exist");
        _;
    }
    
    modifier claimExists(uint256 _claimId) {
        require(_claimId > 0 && _claimId <= claimCounter, "Claim does not exist");
        _;
    }
    
    // Functions
    
    /**
     * @dev Register a new insurance policy
     */
    function registerPolicy(
        bytes32 _policyHash,
        string memory _policyNumber,
        uint256 _premium,
        uint256 _coverageAmount
    ) public returns (uint256) {
        require(policyHashToId[_policyHash] == 0, "Policy already registered");
        
        policyCounter++;
        uint256 newPolicyId = policyCounter;
        
        policies[newPolicyId] = Policy({
            id: newPolicyId,
            policyHash: _policyHash,
            policyNumber: _policyNumber,
            holder: msg.sender,
            premium: _premium,
            coverageAmount: _coverageAmount,
            registeredAt: block.timestamp,
            isActive: true
        });
        
        policyHashToId[_policyHash] = newPolicyId;
        
        emit PolicyRegistered(
            newPolicyId,
            _policyHash,
            _policyNumber,
            msg.sender,
            _premium,
            _coverageAmount
        );
        
        return newPolicyId;
    }
    
    /**
     * @dev Record premium payment for a policy
     */
    function recordPremiumPayment(
        uint256 _policyId,
        bytes32 _paymentHash,
        uint256 _amount
    ) public policyExists(_policyId) {
        Policy storage policy = policies[_policyId];
        require(policy.isActive, "Policy is not active");
        
        PremiumPayment memory payment = PremiumPayment({
            policyId: _policyId,
            paymentHash: _paymentHash,
            amount: _amount,
            paidAt: block.timestamp
        });
        
        policyPayments[_policyId].push(payment);
        
        emit PremiumPaid(_policyId, _paymentHash, _amount, block.timestamp);
    }
    
    /**
     * @dev Submit an insurance claim
     */
    function recordClaim(
        uint256 _policyId,
        bytes32 _claimHash,
        uint256 _amount,
        string memory _status
    ) public policyExists(_policyId) returns (uint256) {
        Policy storage policy = policies[_policyId];
        require(policy.isActive, "Policy is not active");
        require(_amount <= policy.coverageAmount, "Claim exceeds coverage");
        
        claimCounter++;
        uint256 newClaimId = claimCounter;
        
        claims[newClaimId] = Claim({
            id: newClaimId,
            policyId: _policyId,
            claimHash: _claimHash,
            amount: _amount,
            status: _status,
            submittedAt: block.timestamp,
            processedAt: 0
        });
        
        policyClaims[_policyId].push(newClaimId);
        
        emit ClaimSubmitted(newClaimId, _policyId, _claimHash, _amount, _status);
        
        return newClaimId;
    }
    
    /**
     * @dev Update claim status (for authorized processors)
     */
    function updateClaimStatus(
        uint256 _claimId,
        string memory _status
    ) public claimExists(_claimId) {
        Claim storage claim = claims[_claimId];
        claim.status = _status;
        claim.processedAt = block.timestamp;
        
        emit ClaimProcessed(_claimId, claim.policyId, _status, block.timestamp);
    }
    
    /**
     * @dev Verify if a policy exists by hash
     */
    function verifyPolicy(bytes32 _policyHash) 
        public 
        view 
        returns (
            bool exists,
            uint256 policyId,
            string memory policyNumber,
            uint256 premium
        ) 
    {
        uint256 id = policyHashToId[_policyHash];
        if (id == 0) {
            return (false, 0, "", 0);
        }
        
        Policy storage policy = policies[id];
        return (true, id, policy.policyNumber, policy.premium);
    }
    
    /**
     * @dev Get policy details
     */
    function getPolicyDetails(uint256 _policyId)
        public
        view
        policyExists(_policyId)
        returns (
            string memory policyNumber,
            uint256 premium,
            uint256 coverageAmount,
            bool isActive
        )
    {
        Policy storage policy = policies[_policyId];
        return (
            policy.policyNumber,
            policy.premium,
            policy.coverageAmount,
            policy.isActive
        );
    }
    
    /**
     * @dev Get claim status
     */
    function getClaimStatus(uint256 _claimId)
        public
        view
        claimExists(_claimId)
        returns (
            string memory status,
            uint256 policyId,
            uint256 amount,
            string memory decision
        )
    {
        Claim storage claim = claims[_claimId];
        return (
            claim.status,
            claim.policyId,
            claim.amount,
            claim.status
        );
    }
    
    /**
     * @dev Get all payment history for a policy
     */
    function getPolicyPayments(uint256 _policyId)
        public
        view
        policyExists(_policyId)
        returns (PremiumPayment[] memory)
    {
        return policyPayments[_policyId];
    }
    
    /**
     * @dev Get all claims for a policy
     */
    function getPolicyClaims(uint256 _policyId)
        public
        view
        policyExists(_policyId)
        returns (uint256[] memory)
    {
        return policyClaims[_policyId];
    }
    
    /**
     * @dev Deactivate a policy
     */
    function deactivatePolicy(uint256 _policyId) 
        public 
        policyExists(_policyId) 
    {
        Policy storage policy = policies[_policyId];
        require(msg.sender == policy.holder, "Not policy holder");
        policy.isActive = false;
    }
}
