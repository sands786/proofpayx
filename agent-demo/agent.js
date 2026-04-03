const { ethers } = require("ethers");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

async function runAgent() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["mcp-server/index.js"]
  });
  
  const client = new Client({ name: "proofpayx-agent", version: "1.0.0" });
  await client.connect(transport);
  
  console.log("🤖 ProofPayX Agent is running...");
  console.log("📢 Agent announced: ETH price prediction with 90%+ confidence");
  console.log("⏳ Waiting for escrow creation...");
}

runAgent().catch(console.error);
