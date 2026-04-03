const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0x156C52c25d94956bBf20BE025ACbc55c1A5d56d6";
  const abi = [
    "function createEscrow(address _agent, bytes32 _hashlock, uint8 _minConfidence, uint256 _durationSeconds) external payable returns (uint256)",
    "function verifyAndRelease(uint256 _id, bytes32 _proof, uint8 _confidence) external",
    "function getReputation(address) view returns (uint256,uint256,uint256)"
  ];
  const contract = await ethers.getContractAt(abi, contractAddress);
  
  const agentAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f6b6cc";
  const resultData = "ETH price will be $3500 in 5 minutes";
  const hashlock = ethers.keccak256(ethers.toUtf8Bytes(resultData));
  
  console.log("Creating escrow...");
  const tx = await contract.createEscrow(agentAddress, hashlock, 80, 3600, {
    value: ethers.parseEther("0.001")
  });
  await tx.wait();
  console.log("✅ Escrow created!");
  
  // Get escrow ID (assuming first escrow, increment if needed)
  const escrowId = 0;
  
  console.log("Verifying and releasing payment...");
  const proofHash = ethers.keccak256(ethers.toUtf8Bytes(resultData));
  const tx2 = await contract.verifyAndRelease(escrowId, proofHash, 85);
  await tx2.wait();
  console.log("✅ Payment released! Agent earned 85% of locked amount.");
  
  // Check reputation
  const rep = await contract.getReputation(agentAddress);
  console.log(`Agent reputation: ${rep[0]}% (${rep[1]} jobs, earned ${ethers.formatEther(rep[2])} OKB)`);
}

main().catch(console.error);
