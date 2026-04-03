const { TwitterApi } = require("twitter-api-v2");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// ========== CONFIGURATION ==========
const XLAYER_RPC = "https://testrpc.xlayer.tech";
const CONTRACT_ADDRESS = "0x156C52c25d94956bBf20BE025ACbc55c1A5d56d6";
const STATS_FILE = path.join(__dirname, "stats.json");
const DAILY_SUMMARY_HOUR_UTC = 0; // 00:00 UTC

// ========== TWITTER CLIENT ==========
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

// ========== PROVIDER & CONTRACT ==========
const provider = new ethers.JsonRpcProvider(XLAYER_RPC);
const contractABI = [
  "event EscrowCreated(uint256 id, address payer, address agent, uint256 amount, bytes32 hashlock, uint8 minConfidence)",
  "event Released(uint256 id, address agent, uint256 amount)"
];
const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

// ========== STATS MANAGEMENT ==========
let stats = {
  lastSummaryDate: null,
  totalEscrows: 0,
  totalVolume: ethers.parseEther("0"),
  agents: {}, // { address: { totalJobs, totalConfidence, totalEarned, name? } }
  daily: {
    date: null,
    escrows: 0,
    volume: ethers.parseEther("0")
  }
};

function loadStats() {
  if (fs.existsSync(STATS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STATS_FILE, "utf8"));
      // Convert string amounts back to BigInt
      if (data.totalVolume) data.totalVolume = BigInt(data.totalVolume);
      if (data.daily.volume) data.daily.volume = BigInt(data.daily.volume);
      for (const addr in data.agents) {
        if (data.agents[addr].totalEarned) data.agents[addr].totalEarned = BigInt(data.agents[addr].totalEarned);
      }
      stats = data;
    } catch(e) { console.error("Error loading stats:", e); }
  }
}

function saveStats() {
  const toSave = JSON.parse(JSON.stringify(stats, (key, value) =>
    typeof value === "bigint" ? value.toString() : value
  ));
  fs.writeFileSync(STATS_FILE, JSON.stringify(toSave, null, 2));
}

function updateDailyStats() {
  const now = new Date();
  const today = now.toISOString().slice(0,10);
  if (stats.daily.date !== today) {
    // Post daily summary for previous day if exists
    if (stats.daily.date && stats.daily.escrows > 0) {
      postDailySummary();
    }
    // Reset daily
    stats.daily = {
      date: today,
      escrows: 0,
      volume: ethers.parseEther("0")
    };
  }
}

// ========== TWITTER POSTING HELPERS ==========
async function postThread(tweets) {
  let firstTweetId = null;
  for (const tweet of tweets) {
    try {
      let res;
      if (firstTweetId) {
        res = await twitterClient.v2.reply(tweet, firstTweetId);
      } else {
        res = await twitterClient.v2.tweet(tweet);
        firstTweetId = res.data.id;
      }
      console.log("✅ Tweet posted:", tweet.slice(0, 60) + "...");
      await new Promise(r => setTimeout(r, 2000));
    } catch (error) {
      console.error("❌ Twitter error:", error.message);
    }
  }
}

async function postDailySummary() {
  const dateStr = stats.daily.date;
  const dailyVolume = ethers.formatEther(stats.daily.volume);
  const totalVolume = ethers.formatEther(stats.totalVolume);
  // Build leaderboard (top 3 by totalEarned)
  const leaderboard = Object.entries(stats.agents)
    .map(([addr, data]) => ({ addr, earned: data.totalEarned || 0n, jobs: data.totalJobs || 0, rep: data.totalConfidence && data.totalJobs ? (data.totalConfidence / data.totalJobs) : 0 }))
    .sort((a,b) => (b.earned > a.earned ? 1 : -1))
    .slice(0,3);
  
  let leaderText = "";
  if (leaderboard.length) {
    leaderText = "\n🏆 *Top Agents by Earnings:*\n";
    leaderboard.forEach((a, i) => {
      leaderText += `${i+1}. ${a.addr.slice(0,6)}...${a.addr.slice(-4)} — ${ethers.formatEther(a.earned)} OKB (${a.rep}% rep, ${a.jobs} jobs)\n`;
    });
  } else {
    leaderText = "\nNo agents yet. Be the first!";
  }

  const thread = [
    `📊 *ProofPayX Daily Report* – ${dateStr}\n\n` +
    `🔹 Escrows created: ${stats.daily.escrows}\n` +
    `🔹 Volume: ${dailyVolume} OKB\n` +
    `🔹 Total all-time volume: ${totalVolume} OKB\n` +
    leaderText +
    `\n#ProofPayX #OKXBuildX #XLayer`,
    `🚀 The trustless AI agent economy is growing.\n` +
    `Build your own agent: https://github.com/sands786/proofpayx\n` +
    `Try the demo: https://proofpayx.vercel.app (coming soon)`
  ];
  await postThread(thread);
}

// ========== EVENT HANDLERS (Polling) ==========
let lastBlock = 0;
const knownEventIds = new Set();

async function checkEvents() {
  try {
    const current = await provider.getBlockNumber();
    if (lastBlock === 0) {
      lastBlock = current - 20;
      if (lastBlock < 0) lastBlock = 0;
    }
    if (current <= lastBlock) return;

    const created = await contract.queryFilter("EscrowCreated", lastBlock, current);
    const released = await contract.queryFilter("Released", lastBlock, current);

    for (const event of created) {
      const id = event.args.id.toString();
      if (knownEventIds.has(`created-${id}`)) continue;
      knownEventIds.add(`created-${id}`);
      
      const { payer, agent, amount, minConfidence } = event.args;
      const ethAmount = ethers.formatEther(amount);
      // Update stats
      stats.totalEscrows++;
      stats.totalVolume += amount;
      stats.daily.escrows++;
      stats.daily.volume += amount;
      if (!stats.agents[agent]) stats.agents[agent] = { totalJobs: 0, totalConfidence: 0, totalEarned: 0n };
      // (we'll update reputation later on release)
      saveStats();

      // Post rich thread
      const thread = [
        `🔒 *New Escrow #${id}* on @X_Layer\n\n` +
        `🤖 Agent: ${agent.slice(0,6)}...${agent.slice(-4)}\n` +
        `💰 Amount: ${ethAmount} OKB\n` +
        `🎯 Min Confidence: ${minConfidence}%\n` +
        `🔐 Funds locked. Trustless execution begins.`,
        `⚡ The agent must deliver a verifiable result.\n` +
        `Payment will auto-release based on confidence.\n` +
        `No middlemen. Just math.`,
        `📈 Follow this thread for updates.\n` +
        `#ProofPayX #OKXBuildX #AICommerce`
      ];
      await postThread(thread);
    }

    for (const event of released) {
      const id = event.args.id.toString();
      if (knownEventIds.has(`released-${id}`)) continue;
      knownEventIds.add(`released-${id}`);
      
      const { agent, amount } = event.args;
      const ethAmount = ethers.formatEther(amount);
      // Update agent reputation (assuming we have confidence from some source – we can get from contract)
      // For simplicity, we'll fetch from contract getReputation
      try {
        const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, ["function getReputation(address) view returns (uint256,uint256,uint256)"], provider);
        const rep = await contractInstance.getReputation(agent);
        if (stats.agents[agent]) {
          stats.agents[agent].totalEarned = (stats.agents[agent].totalEarned || 0n) + amount;
          stats.agents[agent].totalJobs = Number(rep[1]);
          stats.agents[agent].totalConfidence = Number(rep[0]) * stats.agents[agent].totalJobs;
        }
        saveStats();
      } catch(e) { console.error("Reputation fetch error", e); }

      const thread = [
        `✅ *Escrow #${id} COMPLETED!*\n\n` +
        `🤖 Agent ${agent.slice(0,6)}...${agent.slice(-4)} earned ${ethAmount} OKB\n` +
        `🔓 Payment automatically released.`,
        `🔁 This is how AI agents earn trustlessly.\n` +
        `No disputes. No delays. Just cryptographic proof.`,
        `🏆 Another win for #ProofPayX on @X_Layer\n` +
        `Build your own: https://github.com/sands786/proofpayx`
      ];
      await postThread(thread);
    }

    lastBlock = current;
  } catch (err) {
    console.error("Polling error:", err.message);
  }
}

// ========== DAILY SUMMARY CHECK (on startup and every hour) ==========
async function checkDailySummary() {
  const now = new Date();
  const lastSummary = stats.lastSummaryDate ? new Date(stats.lastSummaryDate) : null;
  const shouldPost = !lastSummary || 
    (now.getUTCHours() >= DAILY_SUMMARY_HOUR_UTC && lastSummary.getUTCHours() < DAILY_SUMMARY_HOUR_UTC &&
     now.getUTCDate() !== lastSummary.getUTCDate());
  if (shouldPost && stats.daily.escrows > 0) {
    await postDailySummary();
    stats.lastSummaryDate = now.toISOString();
    saveStats();
  }
}

// ========== INITIALIZATION ==========
loadStats();
updateDailyStats();
checkDailySummary();

// Poll every 15 seconds
setInterval(checkEvents, 15000);
// Check daily summary every hour
setInterval(checkDailySummary, 60 * 60 * 1000);

console.log("🐦 ProofPayX Twitter bot running with rich threads, daily stats, and leaderboard");
