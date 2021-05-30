# TradeSplitter Research
## Splitting Trades Between Uni and Sushi
This one is relatively simple. Since price impact scales linearly with liquidity, the trade size must be split proportionally to the pool size. For example, if the Uniswap pool has 70M in liquidity, and the Sushiswap pool has 30M, then the trade must be split 70% to Uniswap and 30% to Sushiswap.  
This strategy makes one assumption, that the price on Uniswap is equal to the price on Sushiswap. In cases where the trade size is exceedingly large, it is likely that this assumption is fair, as the price difference is likely much less than the price impact

## Splitting Trades Between Uni V2 and UNI V3
### Strategy 1: Off-chain computation
This is likely the simplest, but least trustless strategy. This requires that we calculate the price impact experienced at regular interval splits between v2 and v3. When we find a percentage split where the price impact is identical for v2 and v3, we have found the one that experiences the least total slippage. An example of this method can be seen in `src/offchainV2V3Splitter.ts`
This method's main drawback is requiring a trusted keeper to calculate this split off-chain. Additionally, this method is slow to compute with a high degree of accuracy. There may be some optimizations we can make to increase its speed.

### Strategy 2: On-chain computation
It may be possible to efficiently compute the split on-chain. This strategy would require completing a similar computation as Uniswap V3 does when it performs a swap. We would perform a mock v3 swap in our own contract, where we calculate the amount of liquidity that has been swapped as we pass each liquidity tick. At the end of each tick, we know our current tick position (and thus the amount of price impact we have so far experienced), as well as the amount we have already swapped (and thus the amount left to be swapped). At each tick, we would use the amount left to be swapped, and check what the price impact would be in a simulated v2 swap for that amount. When the price impact of the simulated v2 swap is equal to the price impact of the ongoing simulated v3 swap, we have determined the optimal split.  
This strategy has several downsides. The first is gas costs. Although this is likely to be significantly cheaper than the naive approach, it still requires simulating a mock v3 swap, and many mock v2 swaps (fortunately the mock v2 price impact calculation is very cheap). Another downside to this strategy is its complexity. Successfully executing this requires a deep understanding of Uniswap V3, and is therefore prone to bugs. Finally, I am unsure how this strategy can be expanded to accommodate multihop transactions. An implementation for this would add even more complexity, and would, unfortunately, be required for BTC2x-FLI.

### Strategy 3: V3 with sqrtPriceLimit then V2
Uniswap V3's sqrtPriceLimitX96 parameter provides a min/max on what the price ratio of the assets will be after a swap is executed. This means that we could instead execute our swap in terms of a maximum acceptable price impact, rather than just aiming to be the most efficient. For example, we can tune this parameter to execute a trade with a maximum of 1% price impact. We can also calculate the slippage of a V2 trade to aim for a 1% impact as well. For example, at the time of writing, a 1% price impact would allow us to sell ~580 ETH into USDC on Uniswap V2, plus an additional 5300 ETH on Uniswap V3. If our trade size was just 500 ETH, 100% of the trade would flow through V3. If our trade size though was 5500 ETH, then the first 5300 would flow through V3, and the additional 200 ETH would flow through V2. Under normal market conditions, this strategy would likely route 100% of the liquidity to V3 (which would likely provide us with a better trade than using just V2, but be slightly suboptimal compared to a perfect V2/V3 split). In abnormal market conditions, when V3 is performing poorly due to a large amount of liquidity being out of range of the current price, our trade would be partially routed through V3 (until we hit the 1% price impact limit), then the spillover of the trade would be routed through V2 (which would complete the trade, since a V2 pool can absorb relatively large trades at 1% price impact even in abnormal market circumstances).  
This strategy has the benefits of occurring entirely on-chain, while also being simple and gas efficient. Additionally, this strategy will perform almost as well a strategies 1 and 2 during normal market conditions. Even in abnormal market conditions, this strategy limits the price impact to a known value (1% in these examples).