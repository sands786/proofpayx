const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const resolverAddress = "0x04b772f0cf69f45956061100d14bc5417b9ba3eb";
  const ProofPayX = await ethers.getContractFactory("ProofPayX");
  const contract = await ProofPayX.deploy(resolverAddress);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("✅ ProofPayX deployed to X Layer MAINNET:", address);
  console.log("Update your frontend and README with this address.");
}

main().catch(console.error);
