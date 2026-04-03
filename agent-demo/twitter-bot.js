const { TwitterApi } = require("twitter-api-v2");
const { ethers } = require("ethers");
require("dotenv").config();

// Twitter client
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const XLAYER_RPC = "https://testrpc.xlayer.tech";
const CONTRACT_ADDRESS = "0x156C52c25d94956bBf20BE025ACbc55c1A5d56d6";
const provider = new ethers.JsonRpcProvider(XLAYER_RPC);

// ABI for events
const contractABI = [
  "event EscrowCreated(uint256 id, address payer, address agent, uint256 amount, bytes32 hashlock, uint8 minConfidence)",
  "event Released(uint256 id, address agent, uint256 amount)"
];

const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

// Track last processed block
let lastBlock = 0;

async function postTweet(content) {
  try {
    const tweet = await twitterClient.v2.tweet(content);
    console.log("✅ Tweet posted:", content.slice(0, 60) + "...");
  } catch (error) {
    console.error("❌ Twitter error:", error);
  }
}

async function checkForEvents() {
  try {
    const currentBlock = await provider.getBlockNumber();
    if (lastBlock === 0) {
      lastBlock = currentBlock - 10; // Look back 10 blocks on first run
      if (lastBlock < 0) lastBlock = 0;
    }
    if (currentBlock <= lastBlock) return;

    // Get events from lastBlock to currentBlock
    const createdEvents = await contract.queryFilter("EscrowCreated", lastBlock, currentBlock);
    const releasedEvents = await contract.queryFilter("Released", lastBlock, currentBlock);

    for (const event of createdEvents) {
      const { id, payer, agent, amount, minConfidence } = event.args;
      const ethAmount = ethers.formatEther(amount);
      const thread = [
        `🔒 Escrow #${id} created on @X_Layer!\n\nAmount: ${ethAmount} OKB\nMin confidence: ${minConfidence}%\n\nTrustless AI commerce is live. #ProofPayX #OKXBuildX`,
        `Funds locked. Agent will deliver verifiable result. Payment auto-releases based on confidence. No middlemen. Just math.`
      ];
      for (const tweet of thread) await postTweet(tweet);
    }

    for (const event of releasedEvents) {
      const { id, agent, amount } = event.args;
      const ethAmount = ethers.formatEther(amount);
      const thread = [
        `✅ Escrow #${id} COMPLETED!\n\nAgent ${agent.slice(0,6)}...${agent.slice(-4)} earned ${ethAmount} OKB\n\nProof delivered. Confidence verified. Payment released.`,
        `This is the future of AI agent commerce. No disputes. No delays. Just cryptographic proof.\n\n#ProofPayX #OKXBuildX`
      ];
      for (const tweet of thread) await postTweet(tweet);
    }

    lastBlock = currentBlock;
  } catch (error) {
    console.error("Polling error:", error);
  }
}

// Poll every 15 seconds
setInterval(checkForEvents, 15000);
console.log("🐦 ProofPayX Twitter bot running (polling mode)");
