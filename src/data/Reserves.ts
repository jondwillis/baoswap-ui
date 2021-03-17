import { TokenAmount, Pair, Currency, Token, ChainId, WETH } from 'uniswap-xdai-sdk'
import { useMemo } from 'react'
import { abi as IUniswapV2PairABI } from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { Interface } from '@ethersproject/abi'
import { useActiveWeb3React } from '../hooks'

import { useMultipleContractSingleData, useSingleContractMultipleData } from '../state/multicall/hooks'
import { wrappedCurrency } from '../utils/wrappedCurrency'
import { useMasterChefContract } from '../hooks/useContract'
import { PairFarmablePool } from '../components/PositionCard'
import { contractAddresses, useSupportedLpTokenMap } from '../bao/lib/constants'

const PAIR_INTERFACE = new Interface(IUniswapV2PairABI)

export enum PairState {
  LOADING,
  NOT_EXISTS,
  EXISTS,
  INVALID
}

export function usePairs(currencies: [Currency | undefined, Currency | undefined][]): [PairState, Pair | null][] {
  const { chainId } = useActiveWeb3React()

  const tokens = useMemo(
    () =>
      currencies.map(([currencyA, currencyB]) => [
        wrappedCurrency(currencyA, chainId),
        wrappedCurrency(currencyB, chainId)
      ]),
    [chainId, currencies]
  )

  const pairAddresses = useMemo(
    () =>
      tokens.map(([tokenA, tokenB]) => {
        return tokenA && tokenB && !tokenA.equals(tokenB) ? Pair.getAddress(tokenA, tokenB) : undefined
      }),
    [tokens]
  )

  const results = useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'getReserves')

  return useMemo(() => {
    return results.map((result, i) => {
      const { result: reserves, loading } = result
      const tokenA = tokens[i][0]
      const tokenB = tokens[i][1]

      if (loading) return [PairState.LOADING, null]
      if (!tokenA || !tokenB || tokenA.equals(tokenB)) return [PairState.INVALID, null]
      if (!reserves) return [PairState.NOT_EXISTS, null]
      const { reserve0, reserve1 } = reserves
      const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]
      return [
        PairState.EXISTS,
        new Pair(new TokenAmount(token0, reserve0.toString()), new TokenAmount(token1, reserve1.toString()))
      ]
    })
  }, [results, tokens])
}

export function usePair(tokenA?: Currency, tokenB?: Currency): [PairState, Pair | null] {
  return usePairs([[tokenA, tokenB]])[0]
}

export function useAllV2PairsWithLiquidity(v2Pairs: [PairState, Pair | null][]): PairFarmablePool[] {
  const supportedLpTokenMap = useSupportedLpTokenMap()
  return useMemo(() => {
    return v2Pairs
      .map(([, pair]) => pair as Pair)
      .flatMap(v2Pair => {
        const farmablePool = Boolean(v2Pair) && supportedLpTokenMap.get(v2Pair.liquidityToken.address)
        return farmablePool && { pair: v2Pair, farmablePool: farmablePool }
      })
      .filter((pairFarmablePool): pairFarmablePool is PairFarmablePool => !!pairFarmablePool)
  }, [v2Pairs, supportedLpTokenMap])
}

export interface UserInfoPairFarmablePool extends PairFarmablePool {
  stakedAmount: TokenAmount
  rewardDebt: TokenAmount
}

export function useUserInfoPairFarmablePools(
  pairFarmablePools: PairFarmablePool[]
): UserInfoPairFarmablePool[] | undefined {
  const { chainId, account } = useActiveWeb3React()
  const masterChefContract = useMasterChefContract()

  const chainIdNumber = chainId == ChainId.XDAI ? 100 : 4
  const baoRewardToken = (chainId && new Token(chainId, contractAddresses.bao[chainIdNumber], 18)) || WETH[100]
  const accountAddress = account || '0x0'

  const poolIdsAndLpTokens = useMemo(() => {
    const matrix = pairFarmablePools.map(tuple => {
      const { farmablePool } = tuple
      return [farmablePool.pid, accountAddress]
    })
    return matrix
  }, [pairFarmablePools, accountAddress])

  const results = useSingleContractMultipleData(masterChefContract, 'userInfo', poolIdsAndLpTokens)
  console.log(results, 'results')
  const userInfoPairFarmablePool = useMemo(() => {
    return pairFarmablePools
      .map((tuple, i) => {
        const { pair, farmablePool } = tuple
        const stakedAmountResult = results?.[i]?.result?.[0]
        const rewardDebtAmount = results?.[i]?.result?.[1]

        const mergeObject =
          stakedAmountResult && rewardDebtAmount
            ? {
                stakedAmount: new TokenAmount(pair.liquidityToken, stakedAmountResult),
                rewardDebt: new TokenAmount(baoRewardToken, rewardDebtAmount)
              }
            : {
                stakedAmount: new TokenAmount(pair.liquidityToken, '0'),
                rewardDebt: new TokenAmount(baoRewardToken, '0')
              }

        return {
          pair,
          farmablePool,
          stakedAmount: mergeObject.stakedAmount,
          rewardDebt: mergeObject.rewardDebt
        }
      })
      .filter(({ stakedAmount }) => stakedAmount.greaterThan('0'))
  }, [pairFarmablePools, results, baoRewardToken])

  console.log(userInfoPairFarmablePool, 'userInfoPairFarmablePool')

  return userInfoPairFarmablePool
}
