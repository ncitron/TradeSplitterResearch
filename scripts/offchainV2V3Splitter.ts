import assert from "assert";
import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { getUniV2PriceImpact } from "./uniV2PriceImpact";
import { getUniV3PriceImpact } from "./uniV3PriceImpact";

require("dotenv").config();

const run = async () => {
  assert.ok(process.env.WETH);
  assert.ok(process.env.USDC);
  getV2V3Split(process.env.WETH, process.env.USDC, parseEther("400"));
} 

export async function getV2V3Split(inputToken: string, outputToken: string, amount: BigNumber) {
  const skip = 5;
  for (let v3Percent = skip; v3Percent < 100; v3Percent+=skip) {
    const v2Amount = amount.mul(100-v3Percent).div(100);
    const v3Amount = amount.mul(v3Percent).div(100);
    const v2Impact = await getUniV2PriceImpact(inputToken, outputToken, v2Amount);
    const v3Impact = await getUniV3PriceImpact(inputToken, outputToken, v3Amount);
    console.log(`V2 size: ${100-v3Percent}%, V2 impact: ${v2Impact.toFixed(2)}`);
    console.log(`V3 size: ${v3Percent}%, V3 impact: ${v3Impact.toFixed(2)}`);
  }
}

run();