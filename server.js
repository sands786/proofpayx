const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// Configuration
const CONTRACT_ADDRESS = "0x98a0CDd44806017Fb71C88D6863edc5e3F45AE61";
const RPC_URL = "https://testrpc.xlayer.tech/terigon";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Simple in‑memory store for pending payments
const pendingPayments = new Map();

// Endpoint that triggers x402 payment
app.post('/api/x402/request', (req, res) => {
  const { paymentId, amount, recipient, callback } = req.body;
  if (!paymentId || !amount) {
    return res.status(400).json({ error: 'Missing paymentId or amount' });
  }

  // Store payment details for later verification
  pendingPayments.set(paymentId, {
    amount,
    recipient: recipient || CONTRACT_ADDRESS,
    callback: callback || 'http://localhost:3002/api/x402/callback',
    createdAt: Date.now(),
  });

  // Return 402 Payment Required with payment details
  res.status(402).json({
    error: 'payment_required',
    payment: {
      protocol: 'x402',
      version: '1.0',
      chain: 'xlayer-testnet',
      contract: CONTRACT_ADDRESS,
      paymentId: paymentId,
      amount: amount,
      recipient: recipient || CONTRACT_ADDRESS,
      callback: callback || 'http://localhost:3002/api/x402/callback',
    },
  });
});

// Callback endpoint – called by your frontend after payment
app.post('/api/x402/callback', async (req, res) => {
  const { paymentId, txHash } = req.body;
  if (!paymentId || !txHash) {
    return res.status(400).json({ error: 'Missing paymentId or txHash' });
  }

  // Verify the transaction on-chain
  try {
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Check that the transaction called createX402Payment with the correct paymentId
    const contract = new ethers.Contract(CONTRACT_ADDRESS, [
      'function x402Payments(bytes32) view returns (address payer, uint256 amount, bytes32 paymentId, bool settled)',
    ], provider);
    const paymentIdBytes = ethers.keccak256(ethers.toUtf8Bytes(paymentId));
    const payment = await contract.x402Payments(paymentIdBytes);
    if (payment.payer === ethers.ZeroAddress) {
      return res.status(400).json({ error: 'Payment not found on-chain' });
    }

    // Payment verified
    pendingPayments.delete(paymentId);
    res.json({ success: true, message: 'Payment verified and accepted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`x402 server running on http://localhost:${PORT}`);
});
