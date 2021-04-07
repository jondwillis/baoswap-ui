import React, { Suspense, useMemo } from 'react'
import { HashRouter, Route, Switch } from 'react-router-dom'
import { isMobile } from 'react-device-detect'
import styled from 'styled-components'
import Header from '../components/Header'
import Popups from '../components/Popups'
import Web3ReactManager from '../components/Web3ReactManager'
import DarkModeQueryParamReader from '../theme/DarkModeQueryParamReader'
import AddLiquidity from './AddLiquidity'
import {
  RedirectDuplicateTokenIds,
  RedirectOldAddLiquidityPathStructure,
  RedirectToAddLiquidity
} from './AddLiquidity/redirects'
import Pool, { PoolBody } from './Pool'
import Chef from './Chef'
import PoolFinder from './PoolFinder'
import RemoveLiquidity from './RemoveLiquidity'
import { RedirectOldRemoveLiquidityPathStructure } from './RemoveLiquidity/redirects'
import Swap from './Swap'
import { RedirectPathToSwapOnly, RedirectToSwap } from './Swap/redirects'
import Analytics from './Analytics'
import { toV2LiquidityToken, useTrackedTokenPairs } from '../state/user/hooks'
import {
  TokenPairWithLiquidityToken,
  useTokenBalancesWithLoadingIndicator,
  useTokenPairCandidates
} from '../state/wallet/hooks'
import { useAllFarmablePools } from '../bao/lib/constants'
import { useActiveWeb3React } from '../hooks'
import { usePairs } from '../data/Reserves'
import { Pair } from 'uniswap-xdai-sdk'
import { useAllNewRewardPerBlock, useBaoUsdPrice } from '../hooks/Price'
import AppBody from './AppBody'

const AppWrapper = styled.div`
  display: flex;
  flex-flow: column;
  align-items: flex-start;
  overflow-x: hidden;
`

const HeaderWrapper = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  width: 100%;
  justify-content: space-between;
`

const BodyWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding-top: 160px;
  align-items: center;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 10;
  margin-top: ${isMobile ? '20px' : ''};

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
      padding: 16px;
  `};

  z-index: 1;
`

const Marginer = styled.div`
  margin-top: 5rem;
`

export default function App() {
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
    () =>
      pairCandidates.flatMap(([, pair]) => {
        const farmablePool = allFarmablePools.find(p => p.address === pair?.liquidityToken.address)
        return farmablePool && pair && pair instanceof Pair && Boolean(pair) ? { pair, farmablePool } : undefined
      }),
    [pairCandidates, allFarmablePools]
  )

  const baoPriceUsd = useBaoUsdPrice()

  const allNewRewardPerBlock = useAllNewRewardPerBlock(allFarmablePools)

  return (
    <Suspense fallback={null}>
      <HashRouter>
        <Route component={DarkModeQueryParamReader} />
        <Web3ReactManager>
          <AppWrapper>
            <HeaderWrapper>
              <Header />
            </HeaderWrapper>
            <BodyWrapper>
              <Popups />
              <AppBody>
                <Switch>
                  <Route exact strict path="/swap" component={Swap} />
                  <Route exact strict path="/swap/:inputCurrency" component={RedirectToSwap} />
                  <Route exact strict path="/swap/:inputCurrency/:outputCurrency" component={RedirectToSwap} />
                  <Route exact strict path="/send" component={RedirectPathToSwapOnly} />
                  <Route exact strict path="/find" component={PoolFinder} />
                  <Route exact strict path="/pool" component={Pool} />
                  <Route exact strict path="/chef" component={Chef} />
                  <Route exact strict path="/farm" component={Chef} />
                  <Route exact strict path="/create" component={RedirectToAddLiquidity} />
                  <Route exact strict path="/analytics" component={Analytics} />
                  <Route exact path="/add" component={AddLiquidity} />
                  <Route exact path="/add/:currencyIdA" component={RedirectOldAddLiquidityPathStructure} />
                  <Route exact path="/add/:currencyIdA/:currencyIdB" component={RedirectDuplicateTokenIds} />
                  <Route exact strict path="/remove/:tokens" component={RedirectOldRemoveLiquidityPathStructure} />
                  <Route exact strict path="/remove/:currencyIdA/:currencyIdB" component={RemoveLiquidity} />
                  <Route component={RedirectPathToSwapOnly} />
                </Switch>
                <Marginer />
                {PoolBody({
                  v2IsLoading,
                  allV2PairsWithLiquidity,
                  v2PairsBalances,
                  allPairCandidatesWithLiquidity,
                  allNewRewardPerBlock,
                  baoPriceUsd
                })}
              </AppBody>
              <Marginer />
            </BodyWrapper>
          </AppWrapper>
        </Web3ReactManager>
      </HashRouter>
    </Suspense>
  )
}
