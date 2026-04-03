const { TwitterApi } = require("twitter-api-v2");
const { ethers } = require("ethers");
require("dotenv").config();

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const provider = new ethers.JsonRpcProvider("https://testrpc.xlayer.tech");
const CONTRACT_ADDRESS = "0x5614861505566C2c1d260952255cC698C1722251";

const contractABI = [
  "event EscrowCreated(uint256 id, address payer, address agent, uint256 amount, bytes32 hashlock, uint8 minConfidence)",
  "event Released(uint256 id, address agent, uint256 amount)"
];

const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

async function postTweet(content) {
  try {
    const tweet = await twitterClient.v2.tweet(content);
    console.log("✅ Tweet posted:", content.slice(0, 60) + "...");
  } catch (error) {
    console.error("❌ Twitter error:", error);
  }
}

contract.on("EscrowCreated", async (id, payer, agent, amount, hashlock, minConfidence) => {
  const ethAmount = ethers.formatEther(amount);
  const tweet = `🔒 New escrow created on @X_Layer!

ID: ${id}
Amount: ${ethAmount} OKB
Min confidence: ${minConfidence}%

Trustless AI payments with ProofPayX.
#OKXBuildX #ProofPayX #XLayer`;
  await postTweet(tweet);
});

contract.on("Released", async (id, agent, amount) => {
  const ethAmount = ethers.formatEther(amount);
  const tweet = `✅ Payment released! Escrow ${id} completed.

Agent earned ${ethAmount} OKB.

ProofPayX — Stripe for AI agents, but trustless.
#OKXBuildX #ProofPayX`;
  await postTweet(tweet);
});

console.log("🐦 Twitter bot listening for escrow events...");
