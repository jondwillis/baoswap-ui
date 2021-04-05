import { useEffect, useMemo, useState } from 'react'
import { ChainId, Fraction, JSBI, Token, TokenAmount } from 'uniswap-xdai-sdk'
import { useActiveWeb3React, useMainWeb3React } from '.'
import { FarmablePool, priceOracles, sidechainFarmablePool } from '../bao/lib/constants'
import { usePair, useRewardToken } from '../data/Reserves'
import { useSingleCallResult } from '../state/multicall/hooks'
import { useLPContract, useMasterChefContract, usePriceOracleContract } from './useContract'
import { BigNumber } from '@ethersproject/bignumber'

const ten = JSBI.BigInt(10)
// WARN: this could break if bao price changes dramatically and breaks out of js number size
const baoPriceExponent = 100000000

const useFetchPrice = (
  priceId?: string | string,
  base?: string
): { response: BigNumber | null; error: Error | null } => {
  const [response, setResponse] = useState<BigNumber | null>(null)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    const fetchData = async () => {
      if (!priceId || !base) {
        setError(new Error('No URL'))
        return
      }
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${priceId}&vs_currencies=${base}`, {
          headers: {
            accept: 'application/json'
          }
        })
        const json = await res.json()
        const price: number = json[priceId][base]
        const priceExp = price * baoPriceExponent
        setResponse(BigNumber.from(priceExp))
      } catch (error) {
        setError(error)
      }
    }
    fetchData()
  }, [priceId, base])
  return { response, error }
}

export const fetchPrice = async (priceId?: string | string, base?: string): Promise<BigNumber> => {
  if (!priceId || !base) {
    return Promise.reject()
  }
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

  const price: number = json[priceId][base]
  const priceExp = price * baoPriceExponent
  return BigNumber.from(priceExp)
}

function useForeignReserveOf(
  farmablePool: FarmablePool,
  token0: Token | undefined,
  token1: Token | undefined,
  reserveToken: Token | undefined
): TokenAmount | undefined {
  const mainnetWeb3 = useMainWeb3React()
  const foreignToken = useMemo(() => {
    return sidechainFarmablePool(ChainId.MAINNET, farmablePool)?.token
  }, [farmablePool])
  const foreignTokenContract = useLPContract(foreignToken?.address, false, mainnetWeb3.chainId)

  const result = useSingleCallResult(foreignTokenContract, 'getReserves', undefined, undefined, mainnetWeb3)

  return useMemo(() => {
    if (!token0 || !token1 || !reserveToken) {
      // console.log(`no token, token1, or reserveToken for ${farmablePool.symbol}`)
      return undefined
    }
    const reserve: BigNumber | undefined = token0 === reserveToken ? result.result?.[0] : result.result?.[1]
    // reserve && console.log(reserve.toString(), `reserve for ${farmablePool.symbol}`)

    // const { result: reserves } = result
    return reserve ? new TokenAmount(reserveToken, reserve.toString()) : undefined
  }, [result, token0, token1, reserveToken])
}

export function useStakedTVL(
  farmablePool: FarmablePool,
  stakedAmount: TokenAmount | undefined,
  totalSupply: TokenAmount | undefined
): Fraction | undefined {
  const { chainId } = useActiveWeb3React()
  const { isSushi } = farmablePool

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

  // console.log(tokenDescriptor0, `token0Descriptor for ${farmablePool.symbol}`)
  // console.log(token0, `token0 for ${farmablePool.symbol}`)

  const ratioStaked = useMemo(() => (totalSupply ? stakedAmount?.divide(totalSupply) : undefined), [
    totalSupply,
    stakedAmount
  ])

  const priceOraclesForChain = useMemo(() => chainIdNumber && priceOracles[chainIdNumber], [chainIdNumber])

  const { priceOracleBaseToken, priceOracleAddress } = useMemo(() => {
    if (!priceOraclesForChain || !token0 || !token1) {
      return { priceOracleToken: undefined, priceOracleAddress: undefined }
    }
    const token0Oracle = priceOraclesForChain[tokenDescriptor0.address]
    const token1Oracle = priceOraclesForChain[tokenDescriptor1.address]
    // console.log(token0Oracle, `token0Oracle`)
    // console.log(token1Oracle, `token1Oracle for ${farmablePool.symbol}`)
    if (token0Oracle && token0Oracle.startsWith('0x')) {
      return { priceOracleBaseToken: token0, priceOracleAddress: token0Oracle }
    } else if (token1Oracle && token1Oracle.startsWith('0x')) {
      return { priceOracleBaseToken: token1, priceOracleAddress: token1Oracle }
    } else if (token0Oracle) {
      return { priceOracleBaseToken: token0, priceOracleAddress: token0Oracle }
    } else if (token1Oracle) {
      return { priceOracleBaseToken: token1, priceOracleAddress: token1Oracle }
    } else {
      return { priceOracleBaseToken: undefined, priceOracleAddress: undefined }
    }
  }, [priceOraclesForChain, tokenDescriptor0, tokenDescriptor1, token0, token1])

  const isUsingFetchPrice = useMemo(() => !priceOracleAddress || !priceOracleAddress?.startsWith('0x'), [
    priceOracleAddress
  ])
  const fetchPriceCurrency = useMemo(() => (isUsingFetchPrice ? priceOracleAddress : undefined), [
    isUsingFetchPrice,
    priceOracleAddress
  ])
  const fetchPriceBase = useMemo(() => (isUsingFetchPrice ? 'usd' : undefined), [isUsingFetchPrice])
  const fetchPrice = useFetchPrice(fetchPriceCurrency, fetchPriceBase)
  const [, pair] = usePair(token0, token1)
  const foreignReserve = useForeignReserveOf(farmablePool, token0, token1, isSushi ? priceOracleBaseToken : undefined)
  const pricedInReserve = useMemo(() => {
    if (!priceOracleBaseToken) {
      return null
    }
    const usingReserve = isSushi ? foreignReserve : pair?.reserveOf(priceOracleBaseToken)
    return usingReserve
  }, [priceOracleBaseToken, pair, foreignReserve, isSushi])
  // foreignReserve && console.log(foreignReserve.toExact(), `foreignReserve for ${farmablePool.symbol}`)
  const priceOracleContract = usePriceOracleContract(!isUsingFetchPrice ? priceOracleAddress : undefined)

  const priceRaw: string | undefined = useSingleCallResult(priceOracleContract, 'latestRoundData').result?.[1]
  const decimals: string | undefined = useSingleCallResult(priceOracleContract, 'decimals').result?.[0]

  return useMemo(() => {
    const decimated = decimals ? JSBI.exponentiate(ten, JSBI.BigInt(decimals.toString())) : undefined
    const fetchedPriceInUsd = isUsingFetchPrice && !fetchPrice.error ? fetchPrice.response : undefined
    const fetchedBI = fetchedPriceInUsd ? JSBI.BigInt(fetchedPriceInUsd?.toString()) : undefined
    const fetchedFraction = fetchedBI ? new Fraction(fetchedBI, JSBI.BigInt(baoPriceExponent)) : undefined
    const chainFraction = priceRaw && decimated ? new Fraction(JSBI.BigInt(priceRaw), decimated) : undefined
    const priceInUsd = fetchedFraction ? fetchedFraction : chainFraction
    const tvl = priceInUsd && pricedInReserve && priceInUsd.multiply(pricedInReserve).multiply('2')
    const stakedTVL = tvl ? ratioStaked?.multiply(tvl) : undefined
    return stakedTVL
  }, [decimals, isUsingFetchPrice, fetchPrice, priceRaw, pricedInReserve, ratioStaked])
}

// ((bao_price_usd * bao_per_block * blocks_per_year * pool_weight) / (total_pool_value_usd)) * 100.0
export function useAPY(
  farmablePool: FarmablePool | undefined,
  baoPriceUsd: BigNumber,
  tvlUsd: Fraction | undefined
): Fraction | undefined {
  const rewardToken = useRewardToken()

  const masterChef = useMasterChefContract()
  const rewardPerBlockResult: string = useSingleCallResult(masterChef, 'getNewRewardPerBlock', [
    farmablePool?.pid ? farmablePool.pid + 1 : undefined
  ]).result?.[0]

  return useMemo(() => {
    const blocksPerYear = JSBI.BigInt(6311390) // (31556952 (seconds / year)) / (5 blocks/second) = 6311390.4
    const rawRewardPerBlock = JSBI.BigInt(rewardPerBlockResult?.toString() ?? '0')

    const decimated = JSBI.exponentiate(ten, JSBI.BigInt((rewardToken.decimals - 1).toString()))

    const baoPriceBI = JSBI.BigInt(baoPriceUsd.toString())
    const baoPriceFraction = new Fraction(baoPriceBI, JSBI.BigInt(baoPriceExponent / 10)) // uhhh
    const rewardPerBlock = new Fraction(rawRewardPerBlock, decimated)

    return (
      tvlUsd &&
      baoPriceFraction
        .multiply(rewardPerBlock)
        .multiply(blocksPerYear)
        .divide(tvlUsd)
    )
  }, [rewardPerBlockResult, baoPriceUsd, rewardToken.decimals, tvlUsd])
}
