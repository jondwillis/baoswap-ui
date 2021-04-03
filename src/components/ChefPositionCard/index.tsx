import React, { useContext, useState, useCallback, useEffect } from 'react'
import { ChevronUp, ChevronDown, Loader } from 'react-feather'
import styled, { ThemeContext } from 'styled-components'
import { TokenAmount, JSBI, Percent, Fraction } from 'uniswap-xdai-sdk'
import { UserInfoFarmablePool } from '../../data/Reserves'
import { useStakedAmount } from '../../data/Staked'
import { useActiveWeb3React } from '../../hooks'
import { useStake, useUnstake, useHarvestAll } from '../../hooks/Chef'
import { ChefState, initialChefState } from '../../state/chef/reducer'
import { getEtherscanLink } from '../../utils'
import { unwrappedToken } from '../../utils/wrappedCurrency'
import { ButtonSecondary, ButtonPrimary } from '../Button'
import { AutoColumn } from '../Column'
import { HoverCard, FixedHeightRow, BalanceText } from '../PositionCard'
import QuestionHelper from '../QuestionHelper'
import { RowFixed, RowBetween, AutoRow } from '../Row'
import { Dots } from '../swap/styleds'
import { Text } from 'rebass'
import { Lock as LockIcon, Unlock as UnlockIcon } from 'react-feather'
import { ExternalLink } from '../../theme'
import Logo from '../Logo'
import { fetchAPY } from '../../hooks/useFetchAPYCallback'
import { useStakedTVL } from '../../hooks/Price'

interface ChefCardProps {
  farmablePool: UserInfoFarmablePool
  unstakedLPAmount?: TokenAmount | undefined | null
  showUnwrapped?: boolean
  border?: string
  defaultShowMore: boolean
}

export function ChefPositionCard({
  farmablePool,
  unstakedLPAmount,
  border,
  defaultShowMore
}: ChefCardProps): JSX.Element {
  const theme = useContext(ThemeContext)
  const { chainId } = useActiveWeb3React()
  const { stakedAmount, pendingReward, icon, name, pid } = farmablePool

  const rewardCurrency = unwrappedToken(pendingReward.token)

  const allStakedAmount = useStakedAmount(farmablePool.token)

  const [showMore, setShowMore] = useState(defaultShowMore)

  const lpStakedPercentage =
    !!stakedAmount &&
    !!allStakedAmount &&
    stakedAmount.greaterThan('0') &&
    JSBI.greaterThanOrEqual(allStakedAmount.raw, stakedAmount.raw)
      ? new Percent(stakedAmount.raw, allStakedAmount.raw)
      : undefined

  const [apy, setAPY] = useState<number>(-1)
  useEffect(() => {
    fetchAPY(pid)
      .then(apy => setAPY(apy))
      .catch(() => setAPY(-1))
  })

  const { callback: stakeCallback } = useStake(farmablePool, unstakedLPAmount)
  const handleStake = useCallback(() => {
    if (!stakeCallback) {
      return
    }
    stakeCallback()
  }, [stakeCallback])
  const { callback: unstakeCallback } = useUnstake(farmablePool, stakedAmount)
  const handleUnstake = useCallback(() => {
    if (!unstakeCallback) {
      return
    }
    unstakeCallback()
  }, [unstakeCallback])

  const [{ attemptingHarvest }, setChefState] = useState<ChefState>(initialChefState)

  const { callback: harvestCallback } = useHarvestAll([farmablePool])
  const handleHarvestAll = useCallback(() => {
    if (!harvestCallback) {
      return
    }
    setChefState({ attemptingHarvest: true, harvestErrorMessage: undefined, harvestTxnHash: undefined })
    harvestCallback()
      .then(() => {
        setChefState({ attemptingHarvest: false, harvestErrorMessage: undefined, harvestTxnHash: undefined })
      })
      .catch(error => {
        setChefState({
          attemptingHarvest: false,
          harvestErrorMessage: error.message,
          harvestTxnHash: undefined
        })
      })
  }, [harvestCallback])

  const unlockedPending = pendingReward?.multiply(new Fraction('1', '20'))
  const lockedPending = pendingReward?.multiply(new Fraction('19', '20'))

  const IconWrapper = styled.div<{ pending: boolean; success?: boolean }>`
    color: ${({ pending, success, theme }) => (pending ? theme.primary1 : success ? theme.green1 : theme.red1)};
  `
  const allStakedTVL = useStakedTVL(farmablePool, allStakedAmount)
  const yourStakeTVL = useStakedTVL(farmablePool, farmablePool.stakedAmount)

  return (
    <HoverCard border={border} style={{ backgroundColor: theme.bg2 }}>
      <AutoColumn gap="12px">
        <FixedHeightRow onClick={() => setShowMore(!showMore)} style={{ cursor: 'pointer', height: 40 }}>
          <RowFixed>
            <Logo
              srcs={[`chef-logos/${icon}`]}
              alt={name}
              style={{ width: 40, height: 40, objectFit: 'contain', margin: 10 }}
            />
            <AutoColumn>
              <RowFixed>
                <Text fontWeight={500} fontSize={20}>
                  {name}
                </Text>
              </RowFixed>
              <RowFixed>
                <Text fontWeight={300} fontSize={12}>
                  {farmablePool.symbol}
                </Text>
              </RowFixed>
            </AutoColumn>
          </RowFixed>
          <RowFixed>
            {yourStakeTVL && (
              <AutoColumn justify="end" style={{ paddingRight: 8, maxWidth: '4rem' }}>
                <Text fontSize="8pt">Your Stake</Text>
                <BalanceText>{`$${yourStakeTVL.toFixed(2)}`}</BalanceText>
              </AutoColumn>
            )}
            <AutoColumn gap="0.1rem">
              <RowBetween>
                {apy > 0 && (
                  <ExternalLink
                    href={`https://baoview.xyz/pool-metrics/${pid}`}
                    style={{ minWidth: '5rem', alignContent: 'baseline', textAlign: 'end' }}
                  >
                    {apy.toFixed(0)}% <span style={{ flexShrink: 1, fontSize: '7pt' }}> APY ↗</span>
                  </ExternalLink>
                )}
              </RowBetween>
              <RowFixed>
                {!showMore ? (
                  <ButtonSecondary
                    padding="0.2rem"
                    style={{ minWidth: '5rem' }}
                    // paddingLeft="0.5rem"
                    // paddingRight="0.5rem"
                    margin="0"
                    onClick={() => handleHarvestAll()}
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
                          Harvest
                        </Text>
                        <BalanceText style={{ fontSize: '10pt' }} fontWeight={600}>
                          <UnlockIcon size="12px" /> {unlockedPending?.toFixed(0) || '-'}{' '}
                          <span style={{ flexShrink: 1, fontSize: '7pt' }}>{rewardCurrency.symbol}</span>
                        </BalanceText>
                      </span>
                    )}
                  </ButtonSecondary>
                ) : (
                  ''
                )}
              </RowFixed>
            </AutoColumn>
            {showMore ? (
              <ChevronUp size="20" style={{ marginLeft: '2px' }} />
            ) : (
              <ChevronDown size="20" style={{ marginLeft: '2px' }} />
            )}
          </RowFixed>
        </FixedHeightRow>
        {showMore && (
          <AutoColumn gap="8px">
            <FixedHeightRow>
              <RowFixed>
                <Text fontSize={16} fontWeight={500}>
                  All Staked TVL (LP):
                </Text>
              </RowFixed>
              <RowFixed>
                <Text fontSize={16} fontWeight={500}>
                  {allStakedTVL ? `$${allStakedTVL.toFixed(2)}` : '-'}
                </Text>
              </RowFixed>
            </FixedHeightRow>

            <FixedHeightRow>
              <RowFixed>
                <Text fontSize={16} fontWeight={500}>
                  Your Stake (LP):
                </Text>
              </RowFixed>
              <RowFixed>
                <Text fontSize={16} fontWeight={500}>
                  {stakedAmount ? stakedAmount.toFixed(3) : '-'}
                </Text>
              </RowFixed>
            </FixedHeightRow>

            <FixedHeightRow>
              <RowFixed>
                <Text fontSize={16} fontWeight={500}>
                  All Staked (LP):
                </Text>
              </RowFixed>
              <RowFixed>
                <Text fontSize={16} fontWeight={500}>
                  {allStakedAmount ? allStakedAmount.toFixed(3) : '-'}
                </Text>
              </RowFixed>
            </FixedHeightRow>

            <FixedHeightRow>
              <Text fontSize={16} fontWeight={500}>
                Your Stake / All Stake:
              </Text>
              <Text fontSize={16} fontWeight={500}>
                {lpStakedPercentage ? lpStakedPercentage.toFixed(4) + '%' : '-'}
              </Text>
            </FixedHeightRow>

            <RowBetween paddingTop="0.5rem" paddingBottom="0.5rem">
              <AutoColumn style={{ alignContent: 'end', marginRight: 20 }}>
                <RowBetween>
                  <ButtonSecondary
                    onClick={() => handleStake()}
                    disabled={!(unstakedLPAmount && unstakedLPAmount.greaterThan('0'))}
                    padding="0.5rem"
                    style={{ fontWeight: 900, backgroundColor: theme.primary3, padding: '0.2rem', marginBottom: 10 }}
                  >
                    +Stake
                    <QuestionHelper text={`Stakes ALL ${unstakedLPAmount?.toFixed(4)} remaining LP Tokens`} />
                  </ButtonSecondary>
                </RowBetween>
                <RowBetween>
                  <ButtonSecondary
                    onClick={() => handleUnstake()}
                    style={{ backgroundColor: theme.red2, padding: '0.2rem' }}
                  >
                    -Stake
                    <QuestionHelper text={`🚨⚠️Unstakes ALL ${stakedAmount.toFixed(4)} staked LP Tokens`} />
                  </ButtonSecondary>
                </RowBetween>
              </AutoColumn>
              <AutoColumn>
                <ButtonPrimary padding="0.5rem" onClick={() => handleHarvestAll()} disabled={attemptingHarvest}>
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
                        Harvest
                      </Text>
                      <BalanceText style={{ flexShrink: 0, textAlign: 'end' }} pr="0.5rem" fontWeight={800}>
                        &nbsp;&nbsp;
                        <UnlockIcon size="14px" /> {unlockedPending?.toFixed(0) || '-'}{' '}
                        <span style={{ flexShrink: 1, fontSize: '8pt' }}>{rewardCurrency.symbol}</span>
                        <br />
                        + <LockIcon size="14px" /> {lockedPending?.toFixed(0) || '-'}{' '}
                        <span style={{ flexShrink: 1, fontSize: '8pt' }}>{rewardCurrency.symbol}</span>
                      </BalanceText>
                    </span>
                  )}
                </ButtonPrimary>
              </AutoColumn>
            </RowBetween>

            <AutoRow justify="center" marginTop={'10px'}>
              {chainId && (
                <ExternalLink href={getEtherscanLink(chainId, farmablePool.address, 'address')}>
                  View Liquidity Pool Contract ↗
                </ExternalLink>
              )}
            </AutoRow>
          </AutoColumn>
        )}
      </AutoColumn>
    </HoverCard>
  )
}
