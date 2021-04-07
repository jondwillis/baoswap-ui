import { useMemo } from 'react'
import { ChainId, Fraction, JSBI, Token, TokenAmount, WETH } from 'uniswap-xdai-sdk'
import { useActiveWeb3React, useMainWeb3React } from '.'
import { FarmablePool, priceOracles, useSidechainFarmablePool } from '../bao/lib/constants'
import { usePair, useRewardToken } from '../data/Reserves'
import { useSingleCallResult, useSingleContractMultipleData } from '../state/multicall/hooks'
import { useLPContract, useMasterChefContract, usePriceOracleContract } from './useContract'
import { BAO } from '../constants'
import { BigNumber } from '@ethersproject/bignumber'

const ten = JSBI.BigInt(10)

export const useBaoUsdPrice = (): Fraction | undefined => {
  const XDAI = WETH[100]
  const [, pair] = usePair(BAO, XDAI)
  const xDaiUsdOracleAddress = useMemo(() => priceOracles[100][XDAI.address], [XDAI.address])
  const xDaiUsdOracleContract = usePriceOracleContract(xDaiUsdOracleAddress)
  const priceRaw: string | undefined = useSingleCallResult(xDaiUsdOracleContract, 'latestRoundData').result?.[1]
  const decimals: string | undefined = useSingleCallResult(xDaiUsdOracleContract, 'decimals').result?.[0]

  return useMemo(() => {
    if (!pair) {
      return undefined
    }
    const priceOfBaoXdai = pair.priceOf(BAO)
    const decimated = decimals
      ? JSBI.exponentiate(ten, JSBI.subtract(JSBI.BigInt(decimals.toString()), JSBI.BigInt(1)))
      : undefined
    const chainFraction = priceRaw && decimated ? new Fraction(JSBI.BigInt(priceRaw), decimated) : undefined
    return chainFraction ? chainFraction.multiply(priceOfBaoXdai) : undefined
  }, [pair, decimals, priceRaw])
}

function useForeignReserveOf(
  farmablePool: FarmablePool,
  token0: Token | undefined,
  token1: Token | undefined,
  reserveToken: Token | undefined,
  totalSupply: TokenAmount | undefined
): [TokenAmount | undefined, Fraction | undefined] | undefined {
  const mainnetWeb3 = useMainWeb3React()
  const foreignToken = useSidechainFarmablePool(ChainId.MAINNET, farmablePool)?.token
  const foreignTokenContract = useLPContract(foreignToken?.address, false, mainnetWeb3.chainId)

  const result = useSingleCallResult(foreignTokenContract, 'getReserves', undefined, undefined, mainnetWeb3)

  const foreignTotalSupplyResult: string | undefined = useSingleCallResult(
    foreignTokenContract,
    'totalSupply',
    undefined,
    undefined,
    mainnetWeb3
  )?.result?.[0]

  const foreignSupplyRatio = useMemo(() => {
    const foreignSupplyTokenAmount = foreignTotalSupplyResult
      ? new TokenAmount(farmablePool.token, foreignTotalSupplyResult)
      : undefined
    const foreignSupplyRatio =
      totalSupply && foreignSupplyTokenAmount ? totalSupply.divide(foreignSupplyTokenAmount) : undefined
    return foreignSupplyRatio
  }, [foreignTotalSupplyResult, totalSupply, farmablePool.token])

  return useMemo(() => {
    if (!token0 || !token1 || !reserveToken || !farmablePool.isSushi) {
      return undefined
    }

    const reserve: string | undefined = token0 === reserveToken ? result.result?.[0] : result.result?.[1]

    return reserve && foreignSupplyRatio ? [new TokenAmount(reserveToken, reserve), foreignSupplyRatio] : undefined
  }, [result, token0, token1, reserveToken, foreignSupplyRatio, farmablePool.isSushi])
}

export function useStakedTVL(
  farmablePool: FarmablePool,
  stakedAmount: TokenAmount | undefined,
  totalSupply: TokenAmount | undefined,
  baoPriceUsd: Fraction | undefined | null
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

  const isUsingBaoUsdPrice = useMemo(() => !priceOracleAddress || !priceOracleAddress?.startsWith('0x'), [
    priceOracleAddress
  ])

  const [, pair] = usePair(token0, token1)
  const foreign = useForeignReserveOf(farmablePool, token0, token1, priceOracleBaseToken, totalSupply)
  const pricedInReserve = useMemo(() => {
    if (!priceOracleBaseToken) {
      return null
    }
    const usingReserve =
      isSushi && foreign ? foreign[0] : pair?.reserveOf(!isUsingBaoUsdPrice ? priceOracleBaseToken : BAO)
    return usingReserve
  }, [priceOracleBaseToken, isSushi, foreign, pair, isUsingBaoUsdPrice])

  const priceOracleContract = usePriceOracleContract(!isUsingBaoUsdPrice ? priceOracleAddress : undefined)

  const priceRaw: string | undefined = useSingleCallResult(priceOracleContract, 'latestRoundData').result?.[1]
  const decimals: string | undefined = useSingleCallResult(priceOracleContract, 'decimals').result?.[0]

  return useMemo(() => {
    const decimated = decimals ? JSBI.exponentiate(ten, JSBI.BigInt(decimals.toString())) : undefined
    const fetchedPriceInUsd = isUsingBaoUsdPrice ? baoPriceUsd?.divide(JSBI.BigInt(10)) : undefined

    const chainFraction = priceRaw && decimated ? new Fraction(JSBI.BigInt(priceRaw), decimated) : undefined
    const priceInUsd = fetchedPriceInUsd ? fetchedPriceInUsd : chainFraction
    const tvl =
      priceInUsd &&
      pricedInReserve &&
      priceInUsd
        .multiply(pricedInReserve)
        .multiply(isSushi ? (foreign && foreign[1] ? foreign[1] : JSBI.BigInt(0)) : JSBI.BigInt(1))
        .multiply('2')
    const stakedTVL = tvl ? ratioStaked?.multiply(tvl) : undefined
    return stakedTVL
  }, [decimals, isUsingBaoUsdPrice, baoPriceUsd, priceRaw, pricedInReserve, isSushi, foreign, ratioStaked])
}

export const useAllNewRewardPerBlock = (farmablePools: FarmablePool[]): JSBI[] => {
  const masterChef = useMasterChefContract()
  const pids = useMemo(() => farmablePools.map(f => [f.pid + 1]), [farmablePools])

  const rewardPerBlockResults = useSingleContractMultipleData(masterChef, 'getNewRewardPerBlock', pids)

  return useMemo(() => {
    return rewardPerBlockResults.map(r => {
      const result: BigNumber | undefined = r.result?.[0]
      return JSBI.BigInt(result?.toString() ?? '0')
    })
  }, [rewardPerBlockResults])
}

// ((bao_price_usd * bao_per_block * blocks_per_year * pool_weight) / (total_pool_value_usd)) * 100.0
export function useAPY(
  farmablePool: FarmablePool | undefined,
  baoPriceUsd: Fraction | undefined | null,
  newRewardPerBlock: JSBI | undefined,
  tvlUsd: Fraction | undefined
): Fraction | undefined {
  const rewardToken = useRewardToken()

  return useMemo(() => {
    if (!baoPriceUsd || !tvlUsd || !tvlUsd.greaterThan('0') || !newRewardPerBlock) {
      return undefined
    }
    const blocksPerYear = JSBI.BigInt(6311390) // (31556952 (seconds / year)) / (5 blocks/second) = 6311390.4

    const decimated = JSBI.exponentiate(ten, JSBI.BigInt((rewardToken.decimals - 1).toString()))

    const rewardPerBlock = new Fraction(newRewardPerBlock, decimated)

    return (
      tvlUsd &&
      baoPriceUsd
        .multiply(rewardPerBlock)
        .multiply(blocksPerYear)
        .divide(tvlUsd)
    )
  }, [newRewardPerBlock, baoPriceUsd, rewardToken.decimals, tvlUsd])
}
