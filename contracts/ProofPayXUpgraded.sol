// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ProofPayXUpgraded {
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
    
    struct X402Payment {
        address payer;
        uint256 amount;
        bytes32 paymentId;
        bool settled;
    }
    mapping(bytes32 => X402Payment) public x402Payments;
    event X402PaymentCreated(bytes32 indexed paymentId, address payer, uint256 amount);
    event X402PaymentSettled(bytes32 indexed paymentId);
    
    struct Loan {
        address lender;
        address borrower;
        uint256 amount;
        uint256 interest;
        uint256 dueDate;
        bool repaid;
        bool defaulted;
    }
    mapping(uint256 => Loan) public loans;
    uint256 public loanCounter;
    mapping(address => uint256) public creditScore;
    
    event LoanCreated(uint256 loanId, address lender, address borrower, uint256 amount, uint256 dueDate);
    event LoanRepaid(uint256 loanId);
    event LoanDefaulted(uint256 loanId);
    
    struct AgentProfile {
        string name;
        string fate;
        string history;
        uint256 lastActive;
    }
    mapping(address => AgentProfile) public agentProfiles;
    event ProfileUpdated(address agent, string fate);
    
    address public resolver;
    constructor(address _resolver) {
        resolver = _resolver;
    }
    
    function createEscrow(address _agent, bytes32 _hashlock, uint8 _minConfidence, uint256 _durationSeconds)
        external payable returns (uint256)
    {
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
        _updateCreditScore(e.agent);
        emit Verified(_id, _confidence, keccak256(_proof));
        emit Released(_id, e.agent, payout);
        if (refundAmount > 0) emit Refunded(_id, e.payer, refundAmount);
    }
    
    function _updateCreditScore(address agent) internal {
        if (totalJobs[agent] == 0) return;
        uint256 avgConf = totalConfidence[agent] / totalJobs[agent];
        uint256 score = avgConf * 10 + totalJobs[agent] * 2;
        if (score > 1000) score = 1000;
        creditScore[agent] = score;
    }
    
    function createX402Payment(bytes32 paymentId) external payable {
        require(msg.value > 0, "Amount >0");
        require(x402Payments[paymentId].amount == 0, "Payment exists");
        x402Payments[paymentId] = X402Payment({
            payer: msg.sender,
            amount: msg.value,
            paymentId: paymentId,
            settled: false
        });
        emit X402PaymentCreated(paymentId, msg.sender, msg.value);
    }
    
    function settleX402Payment(bytes32 paymentId) external {
        X402Payment storage payment = x402Payments[paymentId];
        require(payment.amount > 0, "No payment");
        require(!payment.settled, "Already settled");
        payment.settled = true;
        payable(msg.sender).transfer(payment.amount);
        emit X402PaymentSettled(paymentId);
    }
    
    function createLoan(address _borrower, uint256 _amount, uint256 _interest, uint256 _durationDays) external payable {
        require(msg.value == _amount, "Exact amount required");
        require(creditScore[_borrower] >= 300, "Borrower credit too low");
        uint256 dueDate = block.timestamp + (_durationDays * 1 days);
        uint256 loanId = loanCounter++;
        loans[loanId] = Loan({
            lender: msg.sender,
            borrower: _borrower,
            amount: _amount,
            interest: _interest,
            dueDate: dueDate,
            repaid: false,
            defaulted: false
        });
        payable(_borrower).transfer(_amount);
        emit LoanCreated(loanId, msg.sender, _borrower, _amount, dueDate);
    }
    
    function repayLoan(uint256 _loanId) external payable {
        Loan storage loan = loans[_loanId];
        require(msg.sender == loan.borrower, "Only borrower");
        require(!loan.repaid && !loan.defaulted, "Loan already settled");
        uint256 totalOwed = loan.amount + loan.interest;
        require(msg.value >= totalOwed, "Insufficient payment");
        payable(loan.lender).transfer(totalOwed);
        loan.repaid = true;
        creditScore[loan.borrower] += 20;
        if (creditScore[loan.borrower] > 1000) creditScore[loan.borrower] = 1000;
        emit LoanRepaid(_loanId);
    }
    
    function defaultLoan(uint256 _loanId) external {
        Loan storage loan = loans[_loanId];
        require(block.timestamp > loan.dueDate && !loan.repaid && !loan.defaulted, "Not due or already settled");
        loan.defaulted = true;
        creditScore[loan.borrower] = creditScore[loan.borrower] > 50 ? creditScore[loan.borrower] - 50 : 0;
        emit LoanDefaulted(_loanId);
    }
    
    function setAgentProfile(string memory _name, string memory _fate, string memory _history) external {
        agentProfiles[msg.sender] = AgentProfile({
            name: _name,
            fate: _fate,
            history: _history,
            lastActive: block.timestamp
        });
        emit ProfileUpdated(msg.sender, _fate);
    }
    
    function getAgentFate(address _agent) external view returns (string memory) {
        return agentProfiles[_agent].fate;
    }
    
    event EscrowCreated(uint256 id, address payer, address agent, uint256 amount, bytes32 hashlock, uint8 minConfidence);
    event Verified(uint256 id, uint8 confidence, bytes32 proofHash);
    event Released(uint256 id, address agent, uint256 amount);
    event Refunded(uint256 id, address payer, uint256 amount);
    receive() external payable {}
}
