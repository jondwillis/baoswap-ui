import React, { useContext, useMemo } from 'react'
import { ThemeContext } from 'styled-components'
import { Pair } from 'uniswap-xdai-sdk'
import { Link } from 'react-router-dom'
import { SwapPoolTabs } from '../../components/NavigationTabs'

import Question from '../../components/QuestionHelper'
import FullPositionCard from '../../components/PositionCard'
import {
  TokenPairWithLiquidityToken,
  useTokenBalancesWithLoadingIndicator,
  useTokenPairCandidates
} from '../../state/wallet/hooks'
import { StyledInternalLink, TYPE } from '../../theme'
import { Text } from 'rebass'
import { LightCard } from '../../components/Card'
import { RowBetween } from '../../components/Row'
import { ButtonPrimary } from '../../components/Button'
import { AutoColumn } from '../../components/Column'

import { useActiveWeb3React } from '../../hooks'
import { usePairs } from '../../data/Reserves'
import { toV2LiquidityToken, useTrackedTokenPairs } from '../../state/user/hooks'
import AppBody from '../AppBody'
import { Dots } from '../../components/swap/styleds'
import { useAllFarmablePools } from '../../bao/lib/constants'
import { FarmSuggestionCard } from '../../components/FarmSuggestionCard'

export default function Pool() {
  const theme = useContext(ThemeContext)
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

  const allV2PairsWithLiquidity = useMemo(
    () => v2Pairs.map(([, pair]) => pair).filter((v2Pair): v2Pair is Pair => Boolean(v2Pair)),
    [v2Pairs]
  )
  const allPairCandidatesWithLiquidity = useMemo(
    () => pairCandidates.map(([, pair]) => pair).filter((v2Pair): v2Pair is Pair => Boolean(v2Pair)),
    [pairCandidates]
  )

  return (
    <>
      <AppBody>
        <SwapPoolTabs active={'pool'} />
        <AutoColumn gap="lg" justify="center">
          <ButtonPrimary id="join-pool-button" as={Link} style={{ padding: 16 }} to="/add/ETH">
            <Text fontWeight={500} fontSize={20}>
              Add Liquidity
            </Text>
          </ButtonPrimary>

          <AutoColumn gap="12px" style={{ width: '100%' }}>
            <RowBetween padding={'0 8px'}>
              <Text color={theme.text1} fontWeight={500}>
                Your Unstaked Liquidity
              </Text>
              <Question text="When you add liquidity, you are given pool tokens that represent your share. If you don’t see a pool you joined in this list, try importing a pool below." />
            </RowBetween>

            {!account ? (
              <LightCard padding="40px">
                <TYPE.body color={theme.text3} textAlign="center">
                  Connect to a wallet to view your liquidity.
                </TYPE.body>
              </LightCard>
            ) : v2IsLoading ? (
              <LightCard padding="40px">
                <TYPE.body color={theme.text3} textAlign="center">
                  <Dots>Loading</Dots>
                </TYPE.body>
              </LightCard>
            ) : allV2PairsWithLiquidity?.length > 0 ? (
              <>
                {allV2PairsWithLiquidity.map(v2Pair => (
                  <FullPositionCard
                    key={v2Pair.liquidityToken.address}
                    pair={v2Pair}
                    unstakedLPAmount={v2PairsBalances[v2Pair.liquidityToken.address]}
                  />
                ))}
              </>
            ) : (
              <LightCard padding="40px">
                <TYPE.body color={theme.text3} textAlign="center">
                  No unstaked liquidity found.
                </TYPE.body>
              </LightCard>
            )}

            <div>
              <Text textAlign="center" fontSize={14} style={{ padding: '.5rem 0 .5rem 0' }}>
                {"Don't see a pool you joined?"}{' '}
                <StyledInternalLink id="import-pool-link" to={'/find'}>
                  {'Import it.'}
                </StyledInternalLink>
              </Text>
            </div>
            <RowBetween padding={'0 8px'}>
              <Text color={theme.text1} fontWeight={500}>
                Farmable Liquidity Suggestions:
              </Text>
              <Question text="These liquidity pools are shown because you have a balance in both tokens in the pair, and the LP can be staked." />
            </RowBetween>

            {v2IsLoading ? (
              <LightCard padding="40px">
                <TYPE.body color={theme.text3} textAlign="center">
                  <Dots>Loading</Dots>
                </TYPE.body>
              </LightCard>
            ) : allPairCandidatesWithLiquidity?.length > 0 ? (
              <>
                {allPairCandidatesWithLiquidity.map(v2Pair => (
                  <FarmSuggestionCard
                    key={`suggest- ${v2Pair.liquidityToken.address}`}
                    pair={v2Pair}
                    unstakedLPAmount={v2PairsBalances[v2Pair.liquidityToken.address]}
                  />
                ))}
              </>
            ) : (
              <LightCard padding="40px">
                <TYPE.body color={theme.text3} textAlign="center">
                  No significant individual token balances found in farmable liquidity pools.
                </TYPE.body>
              </LightCard>
            )}
          </AutoColumn>
        </AutoColumn>
      </AppBody>
    </>
  )
}
