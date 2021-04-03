import { useMemo } from 'react'
import { ChainId, JSBI, Token, TokenAmount, WETH } from 'uniswap-xdai-sdk'
import { useActiveWeb3React } from '.'
import { FarmablePool, priceOracles } from '../bao/lib/constants'
import { usePair } from '../data/Reserves'
import { useSingleCallResult } from '../state/multicall/hooks'
import { usePriceOracleContract } from './useContract'

export function usePriceInBaseXDAI(
  farmablePool: FarmablePool,
  stakedAmount: TokenAmount | undefined
): TokenAmount | undefined {
  const { chainId } = useActiveWeb3React()
  const [tokenAddress0, tokenAddress1] = farmablePool.tokenAddress
  const chainIdNumber = useMemo(() => (chainId == ChainId.XDAI ? 100 : chainId == 1 ? ChainId.MAINNET : undefined), [
    chainId
  ])
  // FIXME: decimals isn't correct
  const token0 = useMemo(() => chainId && new Token(chainId, tokenAddress0, farmablePool.token.decimals), [
    chainId,
    tokenAddress0,
    farmablePool
  ])
  const token1 = useMemo(() => chainId && new Token(chainId, tokenAddress1, farmablePool.token.decimals), [
    chainId,
    tokenAddress1,
    farmablePool
  ])

  console.log(token0, 'token0')
  // const token0Wrapped = wrappedCurrency(token0, chainId)
  // const token1Wrapped = wrappedCurrency(token1, chainId)

  const priceOraclesForChain = useMemo(() => chainIdNumber && priceOracles[chainIdNumber], [chainIdNumber])
  // const priceOracleToken0 = priceOraclesForChain && priceOraclesForChain[tokenAddress0]
  const { priceOracleToken, priceOracleAddress } = useMemo(() => {
    if (!priceOraclesForChain || !token0 || !token1) {
      return { priceOracleToken: undefined, priceOracleAddress: undefined }
    }
    const token0Oracle = priceOraclesForChain[tokenAddress0]
    const token1Oracle = priceOraclesForChain[tokenAddress1]
    if (token0Oracle) {
      return { priceOracleToken: token0, priceOracleAddress: token0Oracle }
    } else if (token1Oracle) {
      return { priceOracleToken: token1, priceOracleAddress: token1Oracle }
    } else {
      return { priceOracleToken: undefined, priceOracleAddress: undefined }
    }
  }, [priceOraclesForChain, tokenAddress0, tokenAddress1, token0, token1])
  const [, pair] = usePair(token0, token1)
  const pricedInReserve = useMemo(() => pair && priceOracleToken && pair.reserveOf(priceOracleToken), [
    priceOracleToken,
    pair
  ])
  const priceOracleContract = usePriceOracleContract(priceOracleAddress)

  // console.log(priceOracleContract, 'priceOracleContract')
  const priceRaw: JSBI | undefined = useSingleCallResult(priceOracleContract, 'latestRoundData').result?.[1]
  const decimals: JSBI | undefined = useSingleCallResult(priceOracleContract, 'decimals').result?.[0]

  // const lpContract = useLPContract(farmablePool.address)

  // const price1CumulativeLast = useSingleCallResult(lpContract, 'price1CumulativeLast').result?.[0]

  // price1CumulativeLast && console.log(price1CumulativeLast, 'price1CumulativeLast')
  // priceRaw && console.log(priceRaw?.toString(), 'priceRaw')
  // decimals && console.log(decimals?.toString(), 'decimals')
  return useMemo(() => {
    const ten = JSBI.BigInt(10)
    const hundred = JSBI.BigInt(100)
    const decimated = decimals && JSBI.multiply(hundred, JSBI.exponentiate(ten, JSBI.BigInt(decimals.toString())))
    const priceInUsd = priceRaw && decimated && JSBI.multiply(JSBI.BigInt(priceRaw.toString()), decimated)
    // TODO: convert to XDAI/USD
    const XDAI = chainIdNumber && WETH[chainIdNumber]
    const price = XDAI && priceInUsd && new TokenAmount(XDAI, priceInUsd)
    // price && console.log(price, 'price')
    // console.log(pricedInReserve?.toFixed(4), `tvl reserve for ${farmablePool.symbol}`)
    const tvl = price && pricedInReserve && JSBI.divide(price.raw, pricedInReserve.raw)
    console.log(tvl?.toString(), `tvl for ${farmablePool.symbol}`)
    const tvlRawPriceInUsd = stakedAmount && tvl && JSBI.multiply(stakedAmount.raw, tvl) //JSBI.multiply(price.raw, JSBI.BigInt(tvl.toFixed(18)))
    const tvlPriceInUsd = XDAI && tvlRawPriceInUsd && new TokenAmount(XDAI, tvlRawPriceInUsd)
    console.log(tvlPriceInUsd?.toFixed(4), `tvlPriceInUsd for ${farmablePool.symbol}`)
    return tvlPriceInUsd ?? undefined //stakedAmount && priceInUsd && priceInUsd.mul(stakedAmount.toExact())
  }, [priceRaw, decimals, chainIdNumber, stakedAmount, pricedInReserve, farmablePool])
}
