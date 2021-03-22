import React, { useContext, useState, useCallback } from 'react'
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
// import DoubleCurrencyLogo from '../DoubleLogo'
import { HoverCard, FixedHeightRow, BalanceText } from '../PositionCard'
import QuestionHelper from '../QuestionHelper'
import { RowFixed, RowBetween, AutoRow } from '../Row'
import { Dots } from '../swap/styleds'
import { Text } from 'rebass'
import { Lock as LockIcon, Unlock as UnlockIcon } from 'react-feather'
import { ExternalLink } from '../../theme'

interface ChefCardProps {
  farmablePool: UserInfoFarmablePool
  unstakedLPAmount?: TokenAmount | undefined | null
  showUnwrapped?: boolean
  border?: string
}

export function ChefPositionCard({ farmablePool, unstakedLPAmount, border }: ChefCardProps) {
  const theme = useContext(ThemeContext)
  const { chainId } = useActiveWeb3React()
  const { stakedAmount, pendingReward } = farmablePool

  // const currency0 = unwrappedToken(pair.token0)
  // const currency1 = unwrappedToken(pair.token1)
  const rewardCurrency = unwrappedToken(pendingReward.token)

  const totalPoolTokens = useStakedAmount(farmablePool.token)

  const [showMore, setShowMore] = useState(true)

  const lpStakedPercentage =
    !!stakedAmount && !!totalPoolTokens && JSBI.greaterThanOrEqual(totalPoolTokens.raw, stakedAmount.raw)
      ? new Percent(stakedAmount.raw, totalPoolTokens.raw)
      : undefined

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
      .then(hash => {
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

  return (
    <HoverCard border={border} style={{ backgroundColor: theme.bg2 }}>
      <AutoColumn gap="12px">
        <FixedHeightRow onClick={() => setShowMore(!showMore)} style={{ cursor: 'pointer' }}>
          <RowFixed>
            {/* <DoubleCurrencyLogo currency0={currency0} currency1={currency1} margin={true} size={20} /> */}
            <Text fontWeight={500} fontSize={20}>
              {farmablePool.name}
              {/* {!currency0 || !currency1 ? <Dots>Loading</Dots> : `${currency0.symbol}/${currency1.symbol}`} */}
            </Text>
            <Text fontWeight={300} fontSize={12}>
              {'  - '}
              {farmablePool.symbol}
            </Text>
          </RowFixed>
          <RowFixed>
            {showMore ? (
              <ChevronUp size="20" style={{ marginLeft: '10px' }} />
            ) : (
              <ChevronDown size="20" style={{ marginLeft: '10px' }} />
            )}
          </RowFixed>
        </FixedHeightRow>
        {showMore && (
          <AutoColumn gap="8px">
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
                  {totalPoolTokens ? totalPoolTokens.toFixed(3) : '-'}
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
                    style={{ fontWeight: 800, backgroundColor: theme.primary3, padding: '0.2rem', marginBottom: 10 }}
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
