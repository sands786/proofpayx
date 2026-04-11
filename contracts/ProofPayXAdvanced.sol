// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ProofPayXAdvanced {
    // ========== Escrow (same as before) ==========
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

    // ========== x402 ==========
    struct X402Payment {
        address payer;
        uint256 amount;
        bytes32 paymentId;
        bool settled;
    }
    mapping(bytes32 => X402Payment) public x402Payments;
    event X402PaymentCreated(bytes32 indexed paymentId, address payer, uint256 amount);
    event X402PaymentSettled(bytes32 indexed paymentId);

    // ========== Lending (basic) ==========
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

    // ========== Marketplace (new) ==========
    struct Task {
        address poster;
        address taker;
        string description;
        uint256 reward;
        uint256 deadline;
        bool taken;
        bool completed;
        string proof;
        bool paid;
    }
    mapping(uint256 => Task) public tasks;
    uint256 public taskCounter;
    event TaskPosted(uint256 taskId, address poster, string description, uint256 reward);
    event TaskTaken(uint256 taskId, address taker);
    event TaskProofSubmitted(uint256 taskId, string proof);
    event TaskPaymentReleased(uint256 taskId, address taker);

    // ========== Credit Lines (underwritten) ==========
    struct CreditLine {
        address borrower;
        address lender;
        uint256 amount;
        uint256 interest;
        uint256 dueDate;
        bool funded;
        bool repaid;
        bool defaulted;
    }
    mapping(uint256 => CreditLine) public creditLines;
    uint256 public creditLineCounter;
    event CreditLineRequested(uint256 lineId, address borrower, uint256 amount, uint256 interest, uint256 dueDate);
    event CreditLineFunded(uint256 lineId, address lender);
    event CreditLineRepaid(uint256 lineId);

    // ========== Civilization stats ==========
    struct Civilization {
        uint256 totalEscrows;
        uint256 totalTasks;
        uint256 totalCreditVolume;
        uint256 totalAgents;
    }
    Civilization public civilization;

    address public resolver;
    constructor(address _resolver) {
        resolver = _resolver;
    }

    // ========== Escrow functions (same as before) ==========
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
        civilization.totalEscrows++;
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

    // ========== x402 ==========
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

    // ========== Lending ==========
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
        civilization.totalCreditVolume += _amount + _interest;
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

    // ========== Marketplace ==========
    function postTask(string memory _description, uint256 _reward, uint256 _durationSeconds) external payable {
        require(msg.value == _reward, "Must send exact reward amount");
        require(bytes(_description).length > 0, "Description required");
        uint256 taskId = taskCounter++;
        tasks[taskId] = Task({
            poster: msg.sender,
            taker: address(0),
            description: _description,
            reward: _reward,
            deadline: block.timestamp + _durationSeconds,
            taken: false,
            completed: false,
            proof: "",
            paid: false
        });
        emit TaskPosted(taskId, msg.sender, _description, _reward);
        civilization.totalTasks++;
    }

    function takeTask(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        require(task.taker == address(0), "Task already taken");
        require(block.timestamp < task.deadline, "Task expired");
        task.taker = msg.sender;
        task.taken = true;
        emit TaskTaken(_taskId, msg.sender);
    }

    function submitTaskProof(uint256 _taskId, string memory _proof) external {
        Task storage task = tasks[_taskId];
        require(task.taker == msg.sender, "Only taker can submit");
        require(!task.completed, "Already completed");
        require(block.timestamp < task.deadline, "Task expired");
        task.proof = _proof;
        task.completed = true;
        emit TaskProofSubmitted(_taskId, _proof);
    }

    function releaseTaskPayment(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        require(task.poster == msg.sender, "Only poster can release");
        require(task.completed, "Task not completed yet");
        require(!task.paid, "Already paid");
        task.paid = true;
        payable(task.taker).transfer(task.reward);
        emit TaskPaymentReleased(_taskId, task.taker);
    }

    // ========== Credit Lines ==========
    function requestCreditLine(uint256 _amount, uint256 _interest, uint256 _durationDays) external {
        require(creditScore[msg.sender] >= 500, "Credit score too low (min 500)");
        uint256 dueDate = block.timestamp + (_durationDays * 1 days);
        uint256 lineId = creditLineCounter++;
        creditLines[lineId] = CreditLine({
            borrower: msg.sender,
            lender: address(0),
            amount: _amount,
            interest: _interest,
            dueDate: dueDate,
            funded: false,
            repaid: false,
            defaulted: false
        });
        emit CreditLineRequested(lineId, msg.sender, _amount, _interest, dueDate);
    }

    function fundCreditLine(uint256 _lineId) external payable {
        CreditLine storage line = creditLines[_lineId];
        require(!line.funded, "Already funded");
        require(msg.value == line.amount, "Send exact amount");
        line.lender = msg.sender;
        line.funded = true;
        payable(line.borrower).transfer(line.amount);
        emit CreditLineFunded(_lineId, msg.sender);
        civilization.totalCreditVolume += line.amount + line.interest;
    }

    function repayCreditLine(uint256 _lineId) external payable {
        CreditLine storage line = creditLines[_lineId];
        require(line.borrower == msg.sender, "Only borrower");
        require(line.funded && !line.repaid && !line.defaulted, "Not repayable");
        uint256 total = line.amount + line.interest;
        require(msg.value >= total, "Insufficient payment");
        payable(line.lender).transfer(total);
        line.repaid = true;
        emit CreditLineRepaid(_lineId);
        // Increase credit score
        creditScore[msg.sender] += 30;
        if (creditScore[msg.sender] > 1000) creditScore[msg.sender] = 1000;
    }

    // ========== Civilization ==========
    function registerAgent() external {
        if (totalJobs[msg.sender] == 0 && creditScore[msg.sender] == 0) {
            civilization.totalAgents++;
        }
    }

    // Events
    event EscrowCreated(uint256 id, address payer, address agent, uint256 amount, bytes32 hashlock, uint8 minConfidence);
    event Verified(uint256 id, uint8 confidence, bytes32 proofHash);
    event Released(uint256 id, address agent, uint256 amount);
    event Refunded(uint256 id, address payer, uint256 amount);
    receive() external payable {}
}
