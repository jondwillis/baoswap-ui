import React, { useCallback, useContext, useMemo, useState } from 'react'
import styled, { ThemeContext } from 'styled-components'
import { Link } from 'react-router-dom'
import { SwapPoolTabs } from '../../components/NavigationTabs'

import Question from '../../components/QuestionHelper'
import Lock from '../../components/LockHelper'
import { BalanceText, ChefPositionCard } from '../../components/PositionCard'
import { ExternalLink, TYPE } from '../../theme'
import { Text } from 'rebass'
import { LightCard } from '../../components/Card'
import { RowBetween, RowFixed } from '../../components/Row'
import { ButtonLight, ButtonPrimary } from '../../components/Button'
import { AutoColumn } from '../../components/Column'

import { useActiveWeb3React } from '../../hooks'
import { useBlockNumber, useWalletModalToggle } from '../../state/application/hooks'
import { useAllV2PairsWithLiquidity, usePairs, useRewardToken, useUserInfoPairFarmablePools } from '../../data/Reserves'
import { toV2LiquidityToken, useTrackedTokenPairs } from '../../state/user/hooks'
import AppBody from '../AppBody'
import { Dots } from '../../components/swap/styleds'

import { useMasterChefContract } from '../../hooks/useContract'
import { getEtherscanLink, shortenAddress } from '../../utils'
import { Fraction, TokenAmount } from 'uniswap-xdai-sdk'
import { useHarvestAll } from '../../hooks/Chef'
import { useLockedEarned } from '../../data/Staked'
import { ChefState, initialChefState } from '../../state/chef/reducer'
import { Loader, Lock as LockIcon, Unlock as UnlockIcon } from 'react-feather'

export default function Chef() {
  const theme = useContext(ThemeContext)
  const { account, chainId } = useActiveWeb3React()

  // toggle wallet when disconnected
  const toggleWalletModal = useWalletModalToggle()

  // fetch the user's balances of all tracked V2 LP tokens
  const trackedTokenPairs = useTrackedTokenPairs()
  const tokenPairsWithLiquidityTokens = useMemo(
    () => trackedTokenPairs.map(tokens => ({ liquidityToken: toV2LiquidityToken(tokens), tokens })),
    [trackedTokenPairs]
  )

  const v2Pairs = usePairs(tokenPairsWithLiquidityTokens.map(({ tokens }) => tokens))

  const allV2PairsWithLiquidity = useAllV2PairsWithLiquidity(v2Pairs)

  const [userInfo, fetchingUserInfo] = useUserInfoPairFarmablePools(allV2PairsWithLiquidity) || []

  const rewardToken = useRewardToken()
  const allPendingRewards = useMemo(
    () =>
      userInfo
        .map(userInfo => userInfo.pendingReward)
        .reduce((sum, current) => sum.add(current), new TokenAmount(rewardToken, '0')),
    [userInfo, rewardToken]
  )

  const unlockedPending = allPendingRewards?.multiply(new Fraction('1', '20'))
  const lockedPending = allPendingRewards?.multiply(new Fraction('19', '20'))
  const masterChefContract = useMasterChefContract()

  const lockedEarnedAmount = useLockedEarned()
  const unlockBlock = 20038657
  const latestBlockNumber = useBlockNumber() || unlockBlock
  const remainingBlocks = Math.max(unlockBlock - latestBlockNumber, 0)
  const { callback } = useHarvestAll(useMemo(() => userInfo.map(({ farmablePool }) => farmablePool), [userInfo]))
  const handleHarvestAll = useCallback(() => {
    
    // setSwapState({ attemptingTxn: true, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: undefined })
    callback()
      // .then(hash => {
      //   setSwapState({ attemptingTxn: false, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: hash })
      // })
  }, [])
  
  const v2IsLoading =
    !account ||
    fetchingUserInfo ||
    v2Pairs?.length < tokenPairsWithLiquidityTokens.length ||
    v2Pairs?.some(V2Pair => !V2Pair)

  const IconWrapper = styled.div<{ pending: boolean; success?: boolean }>`
    color: ${({ pending, success, theme }) => (pending ? theme.primary1 : success ? theme.green1 : theme.red1)};
  `
  return (
    <>
      <AppBody>
        <SwapPoolTabs active={'chef'} />
        <AutoColumn gap="lg" justify="center">
          <AutoColumn gap="12px" style={{ width: '100%' }}>
            {chainId && masterChefContract && (
              <RowBetween padding={'0 8px'}>
                <ExternalLink id="link" href={getEtherscanLink(chainId, masterChefContract.address, 'address')}>
                  BaoMasterFarmer
                  <TYPE.body color={theme.text3}>
                    <b title={masterChefContract.address}>{shortenAddress(masterChefContract.address)}</b>
                  </TYPE.body>
                </ExternalLink>
                <RowFixed>
                  <ButtonPrimary
                    padding="0.5rem"
                    onClick={() => handleHarvestAll()}
                    disabled={attemptingHarvest || !account || v2IsLoading}
                  >
                    {attemptingHarvest ? (
                      <span>
                        <Dots>Harvesting</Dots>
                        <IconWrapper pending={attemptingHarvest} success={!attemptingHarvest}>
                          <Loader />
                        </IconWrapper>
                      </span>
                    ) : (
                      <span>
                        <Text color={theme.text5} fontWeight={600}>
                          Harvest All
                        </Text>
                        <BalanceText style={{ flexShrink: 0, textAlign: 'end' }} pr="0.5rem" fontWeight={800}>
                          &nbsp;&nbsp;
                          <UnlockIcon size="14px" /> {unlockedPending?.toFixed(0) || '-'}{' '}
                          <span style={{ flexShrink: 1, fontSize: '8pt' }}>{rewardToken.symbol}</span>
                          <br />
                          + <LockIcon size="14px" /> {lockedPending?.toFixed(0) || '-'}{' '}
                          <span style={{ flexShrink: 1, fontSize: '8pt' }}>{rewardToken.symbol}</span>
                        </BalanceText>
                      </span>
                    )}
                  </ButtonPrimary>
                </RowFixed>
              </RowBetween>
            )}
            <RowBetween padding={'0 8px'}>
              <RowFixed>
                <Text fontSize={16} fontWeight={500}>
                  Locked {rewardToken.symbol}:
                </Text>
              </RowFixed>
              <RowFixed>
                <TYPE.body>
                  <b>{lockedEarnedAmount.toFixed(2)}</b>
                </TYPE.body>
                <Question
                  text={`Every time you Harvest or change your Stake, you instantly earn 5% of your pending rewards, and the remaining 95% will begin unlocking linearly at xDAI block ${unlockBlock}.`}
                />
                <Lock text={`Linear unlock begins in: ${(remainingBlocks / 12 / 60 / 24).toFixed(2)} days`} />
              </RowFixed>
            </RowBetween>

            <RowBetween padding={'0 8px'}>
              <Text color={theme.text1} fontWeight={500}>
                Your Staked Liquidity Pools:
              </Text>
              <Question text="After you add liquidity to a pair, you are able to stake your position to earn BAOcx." />
            </RowBetween>
            <RowBetween padding={'0 8px'}>
              <TYPE.body color={theme.text3}>
                <i>Sushi LPs coming soon</i>
              </TYPE.body>
            </RowBetween>

            {!account ? (
              <LightCard padding="40px">
                <ButtonLight onClick={toggleWalletModal}>Connect Wallet</ButtonLight>
              </LightCard>
            ) : v2IsLoading ? (
              <LightCard padding="40px">
                <TYPE.body color={theme.text3} textAlign="center">
                  <Dots>Loading</Dots>
                </TYPE.body>
              </LightCard>
            ) : userInfo?.length > 0 ? (
              <>
                {userInfo.map(v2Pair => (
                  <ChefPositionCard key={v2Pair.farmablePool.address} pairFarmablePool={v2Pair} />
                ))}
              </>
            ) : (
              <LightCard padding="40px">
                <TYPE.body color={theme.text3} textAlign="center">
                  No staked liquidity found.
                </TYPE.body>
                <ButtonPrimary id="join-pool-button" as={Link} style={{ padding: 16 }} to="/add/ETH">
                  <Text fontWeight={500} fontSize={20}>
                    Add Liquidity
                  </Text>
                </ButtonPrimary>
              </LightCard>
            )}
          </AutoColumn>
        </AutoColumn>
      </AppBody>
    </>
  )
}
