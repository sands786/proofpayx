const { ethers } = require("ethers");
const fs = require("fs");

const RPC_URL = "https://testrpc.xlayer.tech/terigon";
const provider = new ethers.JsonRpcProvider(RPC_URL);
// Replace with your private key (the one that has testnet OKB)
const privateKey = "0x4861553974ad6c4099c9b92f1a55051d9db75415fe3dfb70806b0adeeb8ee270";
const wallet = new ethers.Wallet(privateKey, provider);

async function main() {
  console.log("Deploying ProofPayXAdvanced...");
  const artifactPath = "./artifacts/contracts/ProofPayXAdvanced.sol/ProofPayXAdvanced.json";
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
  console.log("✅ ProofPayXAdvanced deployed to:", address);
}

main().catch(console.error);
