import { useMemo } from 'react'
import { ChainId, Fraction, JSBI, Token, TokenAmount, WETH } from 'uniswap-xdai-sdk'
import { useActiveWeb3React } from '.'
import { FarmablePool, priceOracles } from '../bao/lib/constants'
import { usePair, useRewardToken } from '../data/Reserves'
import { useSingleCallResult } from '../state/multicall/hooks'
import { useMasterChefContract, usePriceOracleContract } from './useContract'
import { BigNumber } from '@ethersproject/bignumber'

const ten = JSBI.BigInt(10)
const hundred = JSBI.BigInt(100)

export function useStakedTVL(farmablePool: FarmablePool, stakedAmount: TokenAmount | undefined): Fraction | undefined {
  const { chainId } = useActiveWeb3React()
  const [tokenAddress0, tokenAddress1] = farmablePool.tokenAddress
  const chainIdNumber = useMemo(() => (chainId === ChainId.XDAI ? 100 : chainId === ChainId.MAINNET ? 1 : undefined), [
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

  const priceOraclesForChain = useMemo(() => chainIdNumber && priceOracles[chainIdNumber], [chainIdNumber])

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
  priceOracleToken && console.log(priceOracleToken?.address, `priceOracleToken for ${farmablePool.symbol}`)
  const [, pair] = usePair(token0, token1)
  const pricedInReserve = useMemo(() => pair && priceOracleToken && pair.reserveOf(priceOracleToken), [
    priceOracleToken,
    pair
  ])
  const priceOracleContract = usePriceOracleContract(priceOracleAddress)

  const priceRaw: JSBI | undefined = useSingleCallResult(priceOracleContract, 'latestRoundData').result?.[1]
  const decimals: JSBI | undefined = useSingleCallResult(priceOracleContract, 'decimals').result?.[0]

  return useMemo(() => {
    const decimated = decimals && JSBI.multiply(hundred, JSBI.exponentiate(ten, JSBI.BigInt(decimals.toString())))
    const priceInUsd = priceRaw && decimated && JSBI.multiply(JSBI.BigInt(priceRaw.toString()), decimated)
    // TODO: convert to XDAI/USD
    const XDAI = chainIdNumber && WETH[chainIdNumber]
    const price = XDAI && priceInUsd && new TokenAmount(XDAI, priceInUsd)
    // console.log(pricedInReserve?.toFixed(4), `tvl reserve for ${farmablePool.symbol}`)
    const tvl = price && pricedInReserve && new Fraction(price.raw, pricedInReserve.raw)
    const tvlRawPriceInUsd = stakedAmount && tvl && stakedAmount.multiply(tvl)
    const tvlPriceInUsd = tvlRawPriceInUsd
    console.log(tvlPriceInUsd?.toFixed(4), `tvlPriceInUsd for ${farmablePool.symbol}`)
    return tvlPriceInUsd ?? undefined //stakedAmount && priceInUsd && priceInUsd.mul(stakedAmount.toExact())
  }, [priceRaw, decimals, chainIdNumber, stakedAmount, pricedInReserve, farmablePool])
}

// TODO: oracle/ABI doesn't work
export const fetchPrice = async (priceId = 'bao-finance', base = 'usd'): Promise<BigNumber> => {
  let response
  try {
    response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${priceId}&vs_currencies=${base}`, {
      headers: {
        accept: 'application/json'
      }
    })
  } catch (error) {
    console.debug('Failed to fetch APY', error)
  }

  if (!response?.ok) {
    throw new Error(`Failed to fetch APY`)
  }

  const json = await response?.json()

  const price = json[priceId][base]
  return BigNumber.from(price)
}

export function useAPY(
  farmablePool: FarmablePool,
  baoPriceUsd: BigNumber,
  tvlUsd: Fraction | undefined
): Fraction | undefined {
  // ((bao_price_usd * bao_per_block * blocks_per_year * pool_weight) / (total_pool_value_usd)) * 100.0
  const rewardToken = useRewardToken()
  const rewardPriceUsd = new Fraction(JSBI.BigInt(777), JSBI.BigInt(100000)) // TODO: get actual bao/usd
  // const rewardPriceUsd = baoPriceUsd
  console.log(baoPriceUsd)
  const masterChef = useMasterChefContract()
  const rewardPerBlockResult: string = useSingleCallResult(masterChef, 'getNewRewardPerBlock', [
    farmablePool.pid + 1 ?? undefined
  ]).result?.[0]

  const blocksPerYear = JSBI.BigInt(6311390) // (31556952 (seconds / year)) / (5 blocks/second) = 6311390.4
  const rawRewardPerBlock = JSBI.BigInt(rewardPerBlockResult?.toString() ?? '0')

  const decimated = JSBI.exponentiate(ten, JSBI.BigInt((rewardToken.decimals - 1).toString()))
  const rewardPerBlock = new Fraction(rawRewardPerBlock, decimated)

  return (
    tvlUsd &&
    rewardPriceUsd
      .multiply(rewardPerBlock)
      .multiply(blocksPerYear)
      .divide(tvlUsd)
  )
}
