import { useMemo } from 'react'
import { ChainId, Fraction, JSBI, Token, TokenAmount } from 'uniswap-xdai-sdk'
import { useActiveWeb3React } from '.'
import { FarmablePool, priceOracles } from '../bao/lib/constants'
import { usePair, useRewardToken } from '../data/Reserves'
import { useSingleCallResult } from '../state/multicall/hooks'
import { useMasterChefContract, usePriceOracleContract } from './useContract'
import { BigNumber } from '@ethersproject/bignumber'
import { useBlockNumber } from '../state/application/hooks'

const ten = JSBI.BigInt(10)

export function useStakedTVL(
  farmablePool: FarmablePool,
  stakedAmount: TokenAmount | undefined,
  totalSupply: TokenAmount | undefined
): Fraction | undefined {
  const { chainId } = useActiveWeb3React()
  const [tokenDescriptor0, tokenDescriptor1] = farmablePool.tokenAddresses
  const chainIdNumber = useMemo(() => (chainId === ChainId.XDAI ? 100 : chainId === ChainId.MAINNET ? 1 : undefined), [
    chainId
  ])
  const token0 = useMemo(
    () => chainId && new Token(chainId, tokenDescriptor0.address, tokenDescriptor0.decimals, tokenDescriptor0.symbol),
    [chainId, tokenDescriptor0]
  )
  const token1 = useMemo(
    () => chainId && new Token(chainId, tokenDescriptor1.address, tokenDescriptor1.decimals, tokenDescriptor1.symbol),
    [chainId, tokenDescriptor1]
  )

  const ratioStaked = totalSupply ? stakedAmount?.divide(totalSupply) : undefined

  const priceOraclesForChain = useMemo(() => chainIdNumber && priceOracles[chainIdNumber], [chainIdNumber])

  const { priceOracleToken, priceOracleAddress } = useMemo(() => {
    if (!priceOraclesForChain || !token0 || !token1) {
      return { priceOracleToken: undefined, priceOracleAddress: undefined }
    }
    const token0Oracle = priceOraclesForChain[tokenDescriptor0.address]
    const token1Oracle = priceOraclesForChain[tokenDescriptor1.address]
    if (token0Oracle) {
      return { priceOracleToken: token0, priceOracleAddress: token0Oracle }
    } else if (token1Oracle) {
      return { priceOracleToken: token1, priceOracleAddress: token1Oracle }
    } else {
      return { priceOracleToken: undefined, priceOracleAddress: undefined }
    }
  }, [priceOraclesForChain, tokenDescriptor0, tokenDescriptor1, token0, token1])

  const [, pair] = usePair(token0, token1)
  const pricedInReserve = useMemo(() => pair && priceOracleToken && pair.reserveOf(priceOracleToken), [
    priceOracleToken,
    pair
  ])
  const priceOracleContract = usePriceOracleContract(priceOracleAddress)

  const priceRaw: string | undefined = useSingleCallResult(priceOracleContract, 'latestRoundData').result?.[1]
  const decimals: string | undefined = useSingleCallResult(priceOracleContract, 'decimals').result?.[0]

  return useMemo(() => {
    const decimated = decimals ? JSBI.exponentiate(ten, JSBI.BigInt(decimals.toString())) : undefined
    const priceInUsd = priceRaw && decimated ? new Fraction(JSBI.BigInt(priceRaw), decimated) : undefined
    const tvl = priceInUsd && pricedInReserve && priceInUsd.multiply(pricedInReserve).multiply('2')
    const stakedTVL = tvl ? ratioStaked?.multiply(tvl) : undefined
    return stakedTVL ?? undefined
  }, [priceRaw, decimals, pricedInReserve, ratioStaked])
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
  farmablePool: FarmablePool | undefined,
  baoPriceUsd: BigNumber,
  tvlUsd: Fraction | undefined
): Fraction | undefined {
  const block = useBlockNumber()
  // ((bao_price_usd * bao_per_block * blocks_per_year * pool_weight) / (total_pool_value_usd)) * 100.0
  const rewardToken = useRewardToken()
  const rewardPriceUsd = new Fraction(JSBI.BigInt(777), JSBI.BigInt(100000)) // TODO: get actual bao/usd
  // const rewardPriceUsd = baoPriceUsd
  console.log(baoPriceUsd)
  const masterChef = useMasterChefContract()
  const rewardPerBlockResult: string = useSingleCallResult(masterChef, 'getNewRewardPerBlock', [
    farmablePool?.pid ? farmablePool.pid + 1 : undefined
  ]).result?.[0]

  return useMemo(() => {
    const blocksPerYear = JSBI.BigInt(6311390) // (31556952 (seconds / year)) / (5 blocks/second) = 6311390.4
    const rawRewardPerBlock = JSBI.BigInt(rewardPerBlockResult?.toString() ?? '0')

    const decimated = JSBI.exponentiate(ten, JSBI.BigInt((rewardToken.decimals - 1).toString()))
    const rewardPerBlock = new Fraction(rawRewardPerBlock, decimated)

    console.log(block)
    return (
      tvlUsd &&
      rewardPriceUsd
        .multiply(rewardPerBlock)
        .multiply(blocksPerYear)
        .divide(tvlUsd)
    )
  }, [block])
}
