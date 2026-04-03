const { ethers } = require("hardhat");

async function main() {
  // Replace with your own wallet address for the resolver
  const resolverAddress = "0x04b772f0cf69f45956061100d14bc5417b9ba3eb";
  
  const ProofPayX = await ethers.getContractFactory("ProofPayX");
  const contract = await ProofPayX.deploy(resolverAddress);
  
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  
  console.log("✅ ProofPayX deployed to:", address);
  console.log("📝 Save this address for later steps!");
}

main().catch(console.error);
