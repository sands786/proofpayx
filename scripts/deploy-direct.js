const { ethers } = require("ethers");
const fs = require("fs");
require("dotenv").config();

const XLAYER_RPC = "https://testrpc.xlayer.tech";
const provider = new ethers.JsonRpcProvider(XLAYER_RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Read compiled contract artifact
const artifact = JSON.parse(fs.readFileSync("./artifacts/contracts/ProofPayX.sol/ProofPayX.json", "utf8"));
const contractBytecode = artifact.bytecode;
const contractAbi = artifact.abi;

async function main() {
  const resolverAddress = "0x04b772f0cf69f45956061100d14bc5417b9ba3eb";
  console.log("Deploying corrected ProofPayX contract...");
  
  const factory = new ethers.ContractFactory(contractAbi, contractBytecode, wallet);
  const contract = await factory.deploy(resolverAddress);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  
  console.log("✅ ProofPayX deployed to:", address);
  console.log("Save this address for your frontend and README.");
}

main().catch(console.error);
