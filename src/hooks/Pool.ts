import { usePairs } from '../data/Reserves'
import {
  TokenPairWithLiquidityToken,
  useTokenBalancesWithLoadingIndicator,
  useTokenPairCandidates
} from '../state/wallet/hooks'
import { toV2LiquidityToken, useTrackedTokenPairs } from '../state/user/hooks'
import { useActiveWeb3React } from '.'
import { useMemo } from 'react'
import { PoolProps } from '../pages/Pool'
import { Fraction, Pair } from 'uniswap-xdai-sdk'
import { useAllFarmablePools } from '../constants/bao'
import { useBaoUsdPrice } from './TVL'

export function usePoolProps(): PoolProps {
  const { account } = useActiveWeb3React()

  // fetch the user's balances of all tracked V2 LP tokens
  const trackedTokenPairs = useTrackedTokenPairs()
  const tokenPairsWithLiquidityTokens: TokenPairWithLiquidityToken[] = useMemo(
    () => trackedTokenPairs.map(tokens => ({ liquidityToken: toV2LiquidityToken(tokens), tokens })),
    [trackedTokenPairs]
  )
  const liquidityTokens = useMemo(() => tokenPairsWithLiquidityTokens.map(tpwlt => tpwlt.liquidityToken), [
    tokenPairsWithLiquidityTokens
  ])
  const [v2PairsBalances, fetchingV2PairBalances] = useTokenBalancesWithLoadingIndicator(
    account ?? undefined,
    liquidityTokens
  )

  const allFarmablePools = useAllFarmablePools()

  const [tokenPairCandidates, fetchingTokenPairCandidates] = useTokenPairCandidates(tokenPairsWithLiquidityTokens)
  const farmableAddresses = useMemo(() => allFarmablePools.map(farm => farm.address), [allFarmablePools])
  const farmableTokenPairCandidates = useMemo(
    () => tokenPairCandidates.filter(tokenPair => farmableAddresses.includes(tokenPair.liquidityToken.address)),
    [farmableAddresses, tokenPairCandidates]
  )

  // fetch the reserves for all V2 pools in which the user has a balance
  const liquidityTokensWithBalances = useMemo(
    () =>
      tokenPairsWithLiquidityTokens.filter(({ liquidityToken }) =>
        v2PairsBalances[liquidityToken.address]?.greaterThan('0')
      ),
    [tokenPairsWithLiquidityTokens, v2PairsBalances]
  )

  const v2Pairs = usePairs(liquidityTokensWithBalances.map(({ tokens }) => tokens))
  const pairCandidates = usePairs(farmableTokenPairCandidates.map(({ tokens }) => tokens))

  const v2IsLoading =
    fetchingV2PairBalances ||
    fetchingTokenPairCandidates ||
    v2Pairs?.length < liquidityTokensWithBalances.length ||
    v2Pairs?.some(V2Pair => !V2Pair)

  const baoPriceUsd = useBaoUsdPrice()

  // const allNewRewardPerBlock = useAllNewRewardPerBlock(allFarmablePools)

  // const allPriceOracles = useAllPriceOracleDescriptors(allFarmablePools)

  // const allStakedTVL = useAllStakedTVL(allFarmablePools, allPriceOracles, baoPriceUsd)

  // const allAPYs = useAllAPYs(allFarmablePools, baoPriceUsd, allNewRewardPerBlock, allStakedTVL)

  const allV2PairsWithLiquidity = useMemo(
    () => v2Pairs.map(([, pair]) => pair).filter((v2Pair): v2Pair is Pair => Boolean(v2Pair)),
    [v2Pairs]
  )
  const allPairCandidatesWithLiquidityAndAPY = useMemo(
    () =>
      pairCandidates.flatMap(([, pair]) => {
        if (!pair) {
          return []
        }
        const farmablePoolIndex = allFarmablePools.map(p => p.address).indexOf(pair?.liquidityToken.address)
        const farmablePool = allFarmablePools[farmablePoolIndex]
        return farmablePool && pair && pair instanceof Pair && Boolean(pair)
          ? { pair, farmablePool, apy: new Fraction('0', '1') }
          : []
      }),
    [pairCandidates, allFarmablePools]
  )

  return {
    v2IsLoading,
    allV2PairsWithLiquidity,
    v2PairsBalances,
    allPairCandidatesWithLiquidityAndAPY,
    baoPriceUsd
  }
}
