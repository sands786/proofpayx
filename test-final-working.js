const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = "https://testrpc.xlayer.tech/terigon";
const CONTRACT_ADDRESS = "0x156C52c25d94956bBf20BE025ACbc55c1A5d56d6";
const AGENT_ADDRESS = "0x04b772f0cf69f45956061100d14bc5417b9ba3eb";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const contractABI = [
  "function createEscrow(address _agent, bytes32 _hashlock, uint8 _minConfidence, uint256 _durationSeconds) external payable returns (uint256)",
  "function verifyAndRelease(uint256 _id, bytes memory _proof, uint8 _confidence) external",
  "function escrowCounter() view returns (uint256)"
];

const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

async function main() {
  console.log("🔌 Connecting to X Layer testnet...");
  await provider.getBlockNumber();
  
  // Generate fresh data
  const timestamp = Date.now();
  const resultData = `ETH price prediction ${timestamp}`;
  const proofBytes = ethers.toUtf8Bytes(resultData);
  const hashlock = ethers.keccak256(proofBytes);
  
  console.log(`📝 Creating escrow with data: "${resultData}"`);
  console.log(`🔒 Hashlock: ${hashlock}`);
  
  const tx = await contract.createEscrow(AGENT_ADDRESS, hashlock, 80, 3600, {
    value: ethers.parseEther("0.001")
  });
  await tx.wait();
  
  const counter = await contract.escrowCounter();
  const escrowId = Number(counter) - 1;
  console.log(`✅ Escrow created! ID: ${escrowId}`);
  
  console.log("🔓 Verifying and releasing with same data...");
  const tx2 = await contract.verifyAndRelease(escrowId, proofBytes, 85);
  await tx2.wait();
  
  console.log("🎉 Success! Payment released.");
}

main().catch(console.error);
