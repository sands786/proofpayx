const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { ethers } = require("ethers");
const { swapETHforOKB } = require("./uniswap-skill");
require("dotenv").config();

const XLAYER_RPC = "https://testrpc.xlayer.tech";
const CONTRACT_ADDRESS = "0x5614861505566C2c1d260952255cC698C1722251";
const provider = new ethers.JsonRpcProvider(XLAYER_RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractABI = [
  "function createEscrow(address _agent, bytes32 _hashlock, uint8 _minConfidence, uint256 _durationSeconds) external payable returns (uint256)",
  "function verifyAndRelease(uint256 _id, bytes32 _proof, uint8 _confidence) external",
  "function escrows(uint256) view returns (address payer, address agent, uint256 amount, bytes32 hashlock, uint8 minConfidence, uint8 actualConfidence, uint8 progress, bool released, bool refunded, bool disputed, uint256 createdAt, uint256 expiresAt)",
  "function getReputation(address agent) view returns (uint256, uint256, uint256)"
];

const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

const server = new Server(
  { name: "proofpayx-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "create_escrow",
      description: "Create a new escrow for agent payment",
      inputSchema: {
        type: "object",
        properties: {
          agentAddress: { type: "string" },
          hashlock: { type: "string" },
          minConfidence: { type: "number" },
          amountETH: { type: "number" },
          durationSeconds: { type: "number" }
        },
        required: ["agentAddress", "hashlock", "minConfidence", "amountETH"]
      }
    },
    {
      name: "verify_and_release",
      description: "Agent submits proof to release payment",
      inputSchema: {
        type: "object",
        properties: {
          escrowId: { type: "number" },
          proof: { type: "string" },
          confidence: { type: "number" }
        },
        required: ["escrowId", "proof", "confidence"]
      }
    },
    {
      name: "check_escrow",
      description: "Get escrow details",
      inputSchema: {
        type: "object",
        properties: { escrowId: { type: "number" } },
        required: ["escrowId"]
      }
    },
    {
      name: "swap_to_okb",
      description: "Swap ETH to OKB using Uniswap",
      inputSchema: {
        type: "object",
        properties: { amountETH: { type: "number" } },
        required: ["amountETH"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case "create_escrow": {
      const tx = await contract.createEscrow(
        args.agentAddress,
        args.hashlock,
        args.minConfidence,
        args.durationSeconds || 3600,
        { value: ethers.parseEther(args.amountETH.toString()) }
      );
      const receipt = await tx.wait();
      return { content: [{ type: "text", text: `Escrow created. TX: ${receipt.hash}` }] };
    }
    
    case "verify_and_release": {
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes(args.proof));
      const tx = await contract.verifyAndRelease(args.escrowId, proofHash, args.confidence);
      const receipt = await tx.wait();
      return { content: [{ type: "text", text: `Released. TX: ${receipt.hash}` }] };
    }
    
    case "check_escrow": {
      const escrow = await contract.escrows(args.escrowId);
      return { content: [{ type: "text", text: JSON.stringify(escrow, null, 2) }] };
    }
    
    case "swap_to_okb": {
      const result = await swapETHforOKB(args.amountETH);
      return { content: [{ type: "text", text: result }] };
    }
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ProofPayX MCP server running with Uniswap skill");
}

main();
