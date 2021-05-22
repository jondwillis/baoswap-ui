import React, { useContext } from 'react'
import { ThemeContext } from 'styled-components'
import { Fraction, Pair, TokenAmount } from 'uniswap-xdai-sdk'
import { Link } from 'react-router-dom'
import { SwapPoolTabs } from '../../components/NavigationTabs'

import Question from '../../components/QuestionHelper'
import FullPositionCard from '../../components/PositionCard'
import { StyledInternalLink, TYPE } from '../../theme'
import { Text } from 'rebass'
import { LightCard } from '../../components/Card'
import { RowBetween } from '../../components/Row'
import { ButtonPrimary } from '../../components/Button'
import { AutoColumn } from '../../components/Column'

import { useActiveWeb3React } from '../../hooks'
import { Dots } from '../../components/swap/styleds'
import { FarmablePool } from '../../constants/bao'
import { FarmSuggestionCard } from '../../components/FarmSuggestionCard'
import AppBody from '../AppBody'
import { usePoolProps } from '../../hooks/Pool'

export interface PoolProps {
  v2IsLoading: boolean
  allV2PairsWithLiquidity: Pair[]
  v2PairsBalances: {
    [tokenAddress: string]: TokenAmount | undefined
  }
  allPairCandidatesWithLiquidityAndAPY: { pair: Pair; farmablePool: FarmablePool; apy: Fraction | undefined }[]
  baoPriceUsd: Fraction | undefined
}

export function PoolBody({
  v2IsLoading,
  allV2PairsWithLiquidity,
  v2PairsBalances,
  allPairCandidatesWithLiquidityAndAPY,
  baoPriceUsd
}: PoolProps) {
  const theme = useContext(ThemeContext)
  const { account } = useActiveWeb3React()
  return (
    <AutoColumn gap="12px" style={{ width: '100%' }}>
      {allPairCandidatesWithLiquidityAndAPY.length > 0 && (
        <>
          <RowBetween padding={'0 8px'}>
            <Text color={theme.text1} fontWeight={500}>
              Farmable Liquidity Suggestions:
            </Text>
            <Question text="These liquidity pools are shown because you have a balance in both tokens in the pair, and the LP can be staked." />
          </RowBetween>

          {allPairCandidatesWithLiquidityAndAPY.map((pfp, i) => {
            return pfp && pfp.pair.liquidityToken.address ? (
              <FarmSuggestionCard
                key={`suggest- ${pfp.pair.liquidityToken.address}-${pfp.pair.token0.address}-${pfp.pair.token1.address}`}
                pair={pfp.pair}
                farmablePool={pfp.farmablePool}
                apy={pfp.apy}
                baoPriceUsd={baoPriceUsd}
              />
            ) : (
              <></>
            )
          })}
        </>
      )}

      <RowBetween padding={'0 8px'}>
        <Text color={theme.text1} fontWeight={500}>
          Your Liquidity (Unstaked)
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
          {allV2PairsWithLiquidity.map(
            v2Pair =>
              v2Pair.liquidityToken.address && (
                <FullPositionCard
                  key={`pool-${v2Pair.liquidityToken.address}`}
                  unstakedLPAmount={v2PairsBalances[v2Pair.liquidityToken.address]}
                  pair={v2Pair}
                />
              )
          )}
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
    </AutoColumn>
  )
}

export default function Pool() {
  return (
    <AppBody>
      <SwapPoolTabs active={'pool'} />
      <AutoColumn gap="lg" justify="center">
        <ButtonPrimary id="join-pool-button" as={Link} style={{ padding: 16 }} to="/add/ETH">
          <Text fontWeight={500} fontSize={20}>
            Add Liquidity
          </Text>
        </ButtonPrimary>
      </AutoColumn>
      <span>&nbsp;</span>
      {PoolBody(usePoolProps())}
    </AppBody>
  )
}
