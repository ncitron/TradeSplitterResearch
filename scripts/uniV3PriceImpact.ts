import { ethers } from "hardhat";
import { BigNumberish } from "ethers";
import assert from "assert";

import { Quoter__factory } from "../types/ethers-contracts/factories/Quoter__factory";

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
export async function getUniV3PriceImpact(inputToken: string, outputToken: string, inputAmount: BigNumberish) {

  const [ signer ] = await ethers.getSigners();

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