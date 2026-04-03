const { ethers } = require("ethers");
require("dotenv").config();

const XLAYER_RPC = "https://testrpc.xlayer.tech";
const provider = new ethers.JsonRpcProvider(XLAYER_RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const contractBytecode = "0x" + require("../artifacts/contracts/ProofPayX.sol/ProofPayX.json").bytecode;
const contractAbi = require("../artifacts/contracts/ProofPayX.sol/ProofPayX.json").abi;

async function main() {
  const resolverAddress = "0x04b772f0cf69f45956061100d14bc5417b9ba3eb";
  const factory = new ethers.ContractFactory(contractAbi, contractBytecode, wallet);
  const contract = await factory.deploy(resolverAddress);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("✅ Corrected ProofPayX deployed to:", address);
}

main().catch(console.error);
