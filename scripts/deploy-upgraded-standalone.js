const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

const RPC_URL = "https://testrpc.xlayer.tech/terigon";
const provider = new ethers.JsonRpcProvider(RPC_URL);
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error("❌ Missing PRIVATE_KEY in .env");
  process.exit(1);
}
const wallet = new ethers.Wallet(privateKey, provider);

async function main() {
  console.log("Deploying ProofPayXUpgraded...");
  const artifactPath = "./artifacts/contracts/ProofPayXUpgraded.sol/ProofPayXUpgraded.json";
  if (!fs.existsSync(artifactPath)) {
    console.error("❌ Contract not compiled. Run: npx hardhat compile");
    process.exit(1);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const resolverAddress = "0x04b772f0cf69f45956061100d14bc5417b9ba3eb";
  const contract = await factory.deploy(resolverAddress);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("✅ ProofPayXUpgraded deployed to:", address);
}

main().catch(console.error);
