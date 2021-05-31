import { ethers } from "hardhat";
import { expect } from "chai";
import { WETH9__factory } from "../types/ethers-contracts/factories/WETH9__factory";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { formatEther, parseEther } from "ethers/lib/utils";
import { WETH9 } from "../types/ethers-contracts/WETH9";
import { SwapRouter, SwapRouter__factory } from "../types/ethers-contracts";
import { IERC20 } from "../typechain/IERC20";
import { IERC20__factory } from "../typechain/factories/IERC20__factory";
import { BigNumber } from "ethers";
import { UniV3Factory } from "../types/ethers-contracts/UniV3Factory";
import { UniV3Factory__factory } from "../types/ethers-contracts/factories/UniV3Factory__factory";
import { PoolV3__factory } from "../types/ethers-contracts/factories/PoolV3__factory";

require("dotenv").config();

describe("SqrtLimitSwap", async () => {

  let swapper: SignerWithAddress;
  let swapRouter: SwapRouter;
  let factory: UniV3Factory;
  let weth: WETH9;
  let usdc: IERC20;

  before(async () => {
    [ swapper ] = await ethers.getSigners();
    usdc = IERC20__factory.connect(process.env.USDC || "", swapper);
    weth = WETH9__factory.connect(process.env.WETH || "", swapper);
    swapRouter = SwapRouter__factory.connect(process.env.SWAP_ROUTER || "", swapper);
    factory = UniV3Factory__factory.connect(process.env.FACTORY_V3 || "", swapper);
    await weth.deposit({ value: parseEther("10000") });
  });

  it("should perform a swap up to the limit", async () => {
    const initWeth = await weth.balanceOf(swapper.address);

    await weth.approve(swapRouter.address, parseEther("10000"));

    const poolAddress = await factory.getPool(weth.address, usdc.address, 3000);
    const pool = PoolV3__factory.connect(poolAddress, swapper);
    const globalStorage = await pool.slot0()
    const currentSqrtPrice = globalStorage.sqrtPriceX96;
    const currentPrice = currentSqrtPrice.div(BigNumber.from(2).pow(96)).pow(2).toNumber() / 10**12;
    // This is not actually one percent price impact. It instead sets a maximum price change after trade of 2%.
    // If you assume that the liquidity is flat accross the 2%, then it will equal to 1% slippage. The worst-case
    // scenario outcome for this approximation is when you move across ticks and the liquidity falls off significantly,
    // and you execute the trade a price impact of 2% instead of 1%.
    const onePercentImpactPrice = currentPrice * 1.02;

    const sqrtPriceLimit = BigNumber.from(Math.round(Math.sqrt(onePercentImpactPrice * 10**12))).mul(BigNumber.from(2).pow(96));

    await swapRouter.exactInputSingle({
        tokenIn: weth.address,
        tokenOut: usdc.address,
        fee: 3000,
        recipient: swapper.address,
        deadline: BigNumber.from(2).pow(256).sub(1),
        amountIn: parseEther("10000"),
        amountOutMinimum: 0,
        sqrtPriceLimitX96: sqrtPriceLimit
    });

    const finalWeth = await weth.balanceOf(swapper.address);

    console.log("WETH sold before limit hit: " + parseFloat(formatEther(initWeth.sub(finalWeth))).toFixed(2));
  })
});