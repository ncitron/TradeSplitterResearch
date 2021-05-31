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

require("dotenv").config();

describe("SqrtLimitSwap", async () => {

  let swapper: SignerWithAddress;
  let swapRouter: SwapRouter;
  let weth: WETH9;
  let usdc: IERC20;

  before(async () => {
    [ swapper ] = await ethers.getSigners();
    usdc = IERC20__factory.connect(process.env.USDC || "", swapper);
    weth = WETH9__factory.connect(process.env.WETH || "", swapper);
    swapRouter = SwapRouter__factory.connect(process.env.SWAP_ROUTER || "", swapper);
    await weth.connect(swapper).deposit({ value: parseEther("10000") });
  });

  it("should perform a swap up to the limit", async () => {
    const initWeth = await weth.balanceOf(swapper.address);

    await weth.connect(swapper).approve(swapRouter.address, parseEther("10000"));

    const finalPrice = 1/2380
    const sqrtPriceLimit = BigNumber.from(Math.round(Math.sqrt(finalPrice * 10**12))).mul(BigNumber.from(2).pow(96));
    console.log(sqrtPriceLimit.toString())

    await swapRouter.connect(swapper).exactInputSingle({
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

    console.log(formatEther(initWeth));
    console.log(formatEther(finalWeth));
  })
});