const { ethers } = require("hardhat");

async function main() {
  const resolverAddress = "0x04b772f0cf69f45956061100d14bc5417b9ba3eb";
  const ProofPayXUpgraded = await ethers.getContractFactory("ProofPayXUpgraded");
  const contract = await ProofPayXUpgraded.deploy(resolverAddress);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("✅ ProofPayXUpgraded deployed to:", address);
}

main().catch(console.error);
