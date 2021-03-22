import { TokenAmount, Pair, Currency, Token, ChainId, WETH } from 'uniswap-xdai-sdk'
import { useMemo } from 'react'
import { abi as IUniswapV2PairABI } from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { Interface } from '@ethersproject/abi'
import { useActiveWeb3React } from '../hooks'

import { useMultipleContractSingleData, useSingleContractMultipleData } from '../state/multicall/hooks'
import { wrappedCurrency } from '../utils/wrappedCurrency'
import { useMasterChefContract } from '../hooks/useContract'
import { contractAddresses, FarmablePool } from '../bao/lib/constants'

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

export interface UserInfoFarmablePool extends FarmablePool {
  stakedAmount: TokenAmount
  pendingReward: TokenAmount
}

export function useRewardToken(): Token {
  const { chainId } = useActiveWeb3React()
  const chainIdNumber = chainId === ChainId.XDAI ? 100 : 4
  const rewardSymbol = chainId === ChainId.XDAI ? 'BAO.cx' : 'BAO'
  const baoRewardToken =
    (chainId && new Token(chainId, contractAddresses.bao[chainIdNumber], 18, rewardSymbol)) || WETH[100]

  return baoRewardToken
}

export function useUserInfoFarmablePools(pairFarmablePools: FarmablePool[]): [UserInfoFarmablePool[], boolean] {
  const { account } = useActiveWeb3React()
  const masterChefContract = useMasterChefContract()

  const baoRewardToken = useRewardToken()
  const accountAddress = account || '0x0'

  const poolIdsAndLpTokens = useMemo(() => {
    const matrix = pairFarmablePools.map(farmablePool => {
      return [farmablePool.pid, accountAddress]
    })
    return matrix
  }, [pairFarmablePools, accountAddress])

  const results = useSingleContractMultipleData(masterChefContract, 'userInfo', poolIdsAndLpTokens)
  const pendingRewardResults = useSingleContractMultipleData(masterChefContract, 'pendingReward', poolIdsAndLpTokens)
  const anyLoading: boolean = useMemo(
    () => results.some(callState => callState.loading) || pendingRewardResults.some(callState => callState.loading),
    [results, pendingRewardResults]
  )

  const userInfoFarmablePool = useMemo(() => {
    return pairFarmablePools
      .map((farmablePool, i) => {
        const stakedAmountResult = results?.[i]?.result?.[0]
        const pendingReward = pendingRewardResults?.[i]?.result?.[0]

        const mergeObject =
          stakedAmountResult && pendingReward
            ? {
                stakedAmount: new TokenAmount(farmablePool.token, stakedAmountResult),
                pendingReward: new TokenAmount(baoRewardToken, pendingReward)
              }
            : {
                stakedAmount: new TokenAmount(farmablePool.token, '0'),
                pendingReward: new TokenAmount(baoRewardToken, '0')
              }

        return {
          ...farmablePool,
          stakedAmount: mergeObject.stakedAmount,
          pendingReward: mergeObject.pendingReward
        }
      })
      .filter(({ stakedAmount }) => stakedAmount.greaterThan('0'))
  }, [pairFarmablePools, results, pendingRewardResults, baoRewardToken])

  console.log(userInfoFarmablePool, 'userInfoFarmablePool')

  return [userInfoFarmablePool, anyLoading]
}
