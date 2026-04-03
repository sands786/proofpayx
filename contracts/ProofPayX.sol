// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ProofPayX {
    struct Escrow {
        address payer;
        address agent;
        uint256 amount;
        bytes32 hashlock;
        uint8 minConfidence;
        uint8 actualConfidence;
        uint8 progress;
        bool released;
        bool refunded;
        bool disputed;
        uint256 createdAt;
        uint256 expiresAt;
    }

    mapping(uint256 => Escrow) public escrows;
    uint256 public escrowCounter;

    mapping(address => uint256) public totalJobs;
    mapping(address => uint256) public totalConfidence;
    mapping(address => uint256) public totalPayout;

    address public resolver;

    event EscrowCreated(uint256 id, address payer, address agent, uint256 amount, bytes32 hashlock, uint8 minConfidence);
    event Verified(uint256 id, uint8 confidence, bytes32 proofHash);
    event Released(uint256 id, address agent, uint256 amount);
    event Refunded(uint256 id, address payer, uint256 amount);
    event Disputed(uint256 id, address payer);
    event Resolved(uint256 id, bool releasedToAgent, uint256 amount);

    constructor(address _resolver) {
        resolver = _resolver;
    }

    function createEscrow(
        address _agent,
        bytes32 _hashlock,
        uint8 _minConfidence,
        uint256 _durationSeconds
    ) external payable returns (uint256) {
        require(msg.value > 0, "Amount >0");
        require(_minConfidence <= 100, "Confidence 0-100");
        
        uint256 id = escrowCounter++;
        escrows[id] = Escrow({
            payer: msg.sender,
            agent: _agent,
            amount: msg.value,
            hashlock: _hashlock,
            minConfidence: _minConfidence,
            actualConfidence: 0,
            progress: 0,
            released: false,
            refunded: false,
            disputed: false,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + _durationSeconds
        });
        
        emit EscrowCreated(id, msg.sender, _agent, msg.value, _hashlock, _minConfidence);
        return id;
    }

    // Fixed: accepts bytes memory (the original data)
    function verifyAndRelease(uint256 _id, bytes memory _proof, uint8 _confidence) external {
        Escrow storage e = escrows[_id];
        require(msg.sender == e.agent, "Only agent");
        require(!e.released && !e.refunded && !e.disputed, "Active escrow only");
        require(_confidence >= e.minConfidence, "Confidence too low");
        require(keccak256(_proof) == e.hashlock, "Invalid proof");
        
        e.actualConfidence = _confidence;
        e.progress = 100;
        e.released = true;
        
        uint256 payout = (e.amount * _confidence) / 100;
        uint256 refundAmount = e.amount - payout;
        
        payable(e.agent).transfer(payout);
        if (refundAmount > 0) payable(e.payer).transfer(refundAmount);
        
        totalJobs[e.agent]++;
        totalConfidence[e.agent] += _confidence;
        totalPayout[e.agent] += payout;
        
        emit Verified(_id, _confidence, keccak256(_proof));
        emit Released(_id, e.agent, payout);
        if (refundAmount > 0) emit Refunded(_id, e.payer, refundAmount);
    }

    function dispute(uint256 _id) external {
        Escrow storage e = escrows[_id];
        require(msg.sender == e.payer, "Only payer");
        require(!e.released && !e.refunded && !e.disputed, "Cannot dispute");
        e.disputed = true;
        emit Disputed(_id, msg.sender);
    }

    function resolve(uint256 _id, bool _releaseToAgent) external {
        require(msg.sender == resolver, "Only resolver");
        Escrow storage e = escrows[_id];
        require(e.disputed, "Not disputed");
        require(!e.released && !e.refunded, "Already settled");
        
        if (_releaseToAgent) {
            uint256 payout = (e.amount * e.actualConfidence) / 100;
            payable(e.agent).transfer(payout);
            if (e.amount - payout > 0) payable(e.payer).transfer(e.amount - payout);
            e.released = true;
            emit Resolved(_id, true, payout);
        } else {
            payable(e.payer).transfer(e.amount);
            e.refunded = true;
            emit Resolved(_id, false, e.amount);
        }
    }

    function refund(uint256 _id) external {
        Escrow storage e = escrows[_id];
        require(block.timestamp > e.expiresAt, "Not expired");
        require(!e.released && !e.refunded && !e.disputed, "Already settled");
        e.refunded = true;
        payable(e.payer).transfer(e.amount);
        emit Refunded(_id, e.payer, e.amount);
    }

    function getReputation(address agent) public view returns (uint256, uint256, uint256) {
        if (totalJobs[agent] == 0) return (0, 0, 0);
        return (totalConfidence[agent] / totalJobs[agent], totalJobs[agent], totalPayout[agent]);
    }

    receive() external payable {}
}
