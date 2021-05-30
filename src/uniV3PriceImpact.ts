import { BigNumberish, ethers } from "ethers";
import assert from "assert";

import { Quoter__factory } from "../types/ethers-contracts/factories/Quoter__factory";

const {
  parseEther,
  formatUnits,
} = ethers.utils;

require("dotenv").config();

const run = async () => {

  assert.ok(process.env.WETH);
  assert.ok(process.env.USDC);

  const impactPercentage = await getUniV3PriceImpact(
    process.env.WETH,
    process.env.USDC,
    parseEther("10000")
  );

  console.log(impactPercentage.toFixed(2));
}

/**
 * Calculate price impact. Assumes input token has 18 decimals and output token has 6.
 * 
 * @param inputToken  input token address
 * @param outputToken output token address
 * @param inputAmount amount to test price impact for
 */
async function getUniV3PriceImpact(inputToken: string, outputToken: string, inputAmount: BigNumberish) {

  const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_KEY);
  const signer = ethers.Wallet.createRandom().connect(provider);

  assert.ok(process.env.QUOTER);
  const quoter = Quoter__factory.connect(process.env.QUOTER, signer);

  const smallAmount = 0.01
  const priceSmallAmount = await quoter.callStatic.quoteExactInputSingle(
    inputToken,
    outputToken,
    3000,
    parseEther(smallAmount.toString()),
    0
  );
  const price = priceSmallAmount.mul(1/smallAmount);

  const priceLargeAmount = await quoter.callStatic.quoteExactInputSingle(
    inputToken,
    outputToken,
    3000,
    inputAmount,
    0
  );
  const priceWithImpact = priceLargeAmount.mul(parseEther("1")).div(inputAmount);

  const impact = priceWithImpact.sub(price);
  const impactPercent = impact.toNumber() / price.toNumber() * 100;
  return impactPercent;
}

run();