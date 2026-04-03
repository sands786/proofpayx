const { ethers } = require("ethers");
require("dotenv").config();

const XLAYER_RPC = "https://testrpc.xlayer.tech";
const CONTRACT_ADDRESS = "0x156C52c25d94956bBf20BE025ACbc55c1A5d56d6";
const AGENT_ADDRESS = "0x04b772f0cf69f45956061100d14bc5417b9ba3eb"; // your wallet address

const provider = new ethers.JsonRpcProvider(XLAYER_RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractABI = [
  "function createEscrow(address _agent, bytes32 _hashlock, uint8 _minConfidence, uint256 _durationSeconds) external payable returns (uint256)",
  "function verifyAndRelease(uint256 _id, bytes32 _proof, uint8 _confidence) external",
  "function getReputation(address) view returns (uint256,uint256,uint256)"
];

const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

async function main() {
  const resultData = "ETH price will be $3500 in 5 minutes";
  const hashlock = ethers.keccak256(ethers.toUtf8Bytes(resultData));
  
  console.log("Creating escrow...");
  const tx = await contract.createEscrow(AGENT_ADDRESS, hashlock, 80, 3600, {
    value: ethers.parseEther("0.001")
  });
  await tx.wait();
  console.log("✅ Escrow created!");
  
  const escrowId = 0; // first escrow
  
  console.log("Verifying and releasing payment...");
  const proofHash = ethers.keccak256(ethers.toUtf8Bytes(resultData));
  const tx2 = await contract.verifyAndRelease(escrowId, proofHash, 85);
  await tx2.wait();
  console.log("✅ Payment released! Agent earned 85% of locked amount.");
  
  const rep = await contract.getReputation(AGENT_ADDRESS);
  console.log(`Agent reputation: ${rep[0]}% (${rep[1]} jobs, earned ${ethers.formatEther(rep[2])} OKB)`);
}

main().catch(console.error);
