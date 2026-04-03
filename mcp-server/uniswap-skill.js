const { ethers } = require("ethers");

// X Layer testnet addresses (Uniswap V3)
const UNISWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const OKB_ADDRESS = "0x75231F58b43240c9718Dd58B4967c5114342a86c"; // OKB on X Layer
const WOKB_ADDRESS = "0x4200000000000000000000000000000000000023"; // Wrapped OKB

const provider = new ethers.JsonRpcProvider("https://testrpc.xlayer.tech");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const routerABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
];

async function swapETHforOKB(amountETH) {
  const router = new ethers.Contract(UNISWAP_ROUTER, routerABI, wallet);
  const amountIn = ethers.parseEther(amountETH.toString());
  
  const params = {
    tokenIn: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // native ETH
    tokenOut: OKB_ADDRESS,
    fee: 3000, // 0.3% fee tier
    recipient: wallet.address,
    deadline: Math.floor(Date.now() / 1000) + 1200,
    amountIn: amountIn,
    amountOutMinimum: 0, // For demo; in production use slippage
    sqrtPriceLimitX96: 0
  };
  
  const tx = await router.exactInputSingle(params, { value: amountIn });
  const receipt = await tx.wait();
  return `Swap successful. TX: ${receipt.hash}`;
}

module.exports = { swapETHforOKB };
