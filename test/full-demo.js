const { ethers } = require("ethers");
require("dotenv").config();

const XLAYER_RPC = "https://testrpc.xlayer.tech";
const CONTRACT_ADDRESS = "0x156C52c25d94956bBf20BE025ACbc55c1A5d56d6";
const AGENT_ADDRESS = "0x04b772f0cf69f45956061100d14bc5417b9ba3eb";

const provider = new ethers.JsonRpcProvider(XLAYER_RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractABI = [
  "function createEscrow(address _agent, bytes32 _hashlock, uint8 _minConfidence, uint256 _durationSeconds) external payable returns (uint256)",
  "function verifyAndRelease(uint256 _id, bytes32 _proof, uint8 _confidence) external",
  "function getReputation(address) view returns (uint256,uint256,uint256)",
  "function escrowCounter() view returns (uint256)",
  "event EscrowCreated(uint256 id, address payer, address agent, uint256 amount, bytes32 hashlock, uint8 minConfidence)"
];

const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

async function main() {
  const resultData = "ETH price will be $3500 in 5 minutes";
  const hashlock = ethers.keccak256(ethers.toUtf8Bytes(resultData));
  
  // Get current escrow counter to know next ID
  const counterBefore = await contract.escrowCounter();
  console.log(`Current escrow count: ${counterBefore}`);
  
  console.log("Creating escrow...");
  const tx = await contract.createEscrow(AGENT_ADDRESS, hashlock, 80, 3600, {
    value: ethers.parseEther("0.001")
  });
  const receipt = await tx.wait();
  
  // Find the EscrowCreated event to get the new ID
  const event = receipt.logs
    .map(log => {
      try {
        return contract.interface.parseLog(log);
      } catch (e) { return null; }
    })
    .find(event => event && event.name === "EscrowCreated");
  
  const escrowId = event ? event.args.id : counterBefore;
  console.log(`✅ Escrow created with ID: ${escrowId}`);
  
  console.log("Verifying and releasing payment...");
  const proofHash = ethers.keccak256(ethers.toUtf8Bytes(resultData));
  const tx2 = await contract.verifyAndRelease(escrowId, proofHash, 85);
  await tx2.wait();
  console.log("✅ Payment released! Agent earned 85% of locked amount.");
  
  const rep = await contract.getReputation(AGENT_ADDRESS);
  console.log(`Agent reputation: ${rep[0]}% (${rep[1]} jobs, earned ${ethers.formatEther(rep[2])} OKB)`);
}

main().catch(console.error);
