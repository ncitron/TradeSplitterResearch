import { BigNumberish, ethers } from "ethers";
import assert from "assert";

import { UniswapV2Router02__factory } from "../types/ethers-contracts/factories/UniswapV2Router02__factory";

const {
  parseEther,
  formatUnits,
} = ethers.utils;

require("dotenv").config();

/**
 * Calculate price impact. Assumes input token has 18 decimals and output token has 6.
 * 
 * @param inputToken  input token address
 * @param outputToken output token address
 * @param inputAmount amount to test price impact for
 */
export async function getUniV2PriceImpact(inputToken: string, outputToken: string, inputAmount: BigNumberish) {

  const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_KEY);
  const signer = ethers.Wallet.createRandom().connect(provider);

  assert.ok(process.env.ROUTER);
  const router = UniswapV2Router02__factory.connect(process.env.ROUTER, signer);

  const smallAmount = 0.01
  const priceSmallAmount = (await router.getAmountsOut(parseEther(smallAmount.toString()), [inputToken, outputToken]))[1];
  const price = priceSmallAmount.mul(1/smallAmount);

  const priceLargeAmount = (await router.getAmountsOut(inputAmount, [inputToken, outputToken]))[1];
  const priceWithImpact = priceLargeAmount.mul(parseEther("1")).div(inputAmount);

  const impact = priceWithImpact.sub(price);
  const impactPercent = impact.toNumber() / price.toNumber() * 100;
  return impactPercent;
}