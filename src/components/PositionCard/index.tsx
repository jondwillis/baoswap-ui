import { Fraction, JSBI, Pair, Percent, TokenAmount } from 'uniswap-xdai-sdk'
import { darken } from 'polished'
import React, { useCallback, useContext, useState } from 'react'
import { ChevronDown, ChevronUp, Loader, Lock as LockIcon, Unlock as UnlockIcon } from 'react-feather'
import { Link } from 'react-router-dom'
import { Text } from 'rebass'
import styled, { ThemeContext } from 'styled-components'
import { useTotalSupply } from '../../data/TotalSupply'

import { useActiveWeb3React } from '../../hooks'
import { useTokenBalance } from '../../state/wallet/hooks'
import { ExternalLink } from '../../theme'
import { currencyId } from '../../utils/currencyId'
import { unwrappedToken } from '../../utils/wrappedCurrency'
import { ButtonPrimary, ButtonSecondary } from '../Button'

import Card, { GreyCard } from '../Card'
import { AutoColumn } from '../Column'
import CurrencyLogo from '../CurrencyLogo'
import DoubleCurrencyLogo from '../DoubleLogo'
import { AutoRow, RowBetween, RowFixed } from '../Row'
import { Dots } from '../swap/styleds'
import { getEtherscanLink } from '../../utils'
import { FarmablePool } from '../../bao/lib/constants'
import { UserInfoPairFarmablePool } from '../../data/Reserves'
import { useStakedAmount } from '../../data/Staked'
import { useHarvestAll, useStake, useUnstake } from '../../hooks/Chef'
import { ChefState, initialChefState } from '../../state/chef/reducer'
import QuestionHelper from '../QuestionHelper'

export const FixedHeightRow = styled(RowBetween)`
  height: 24px;
`

export const HoverCard = styled(Card)`
  border: 1px solid ${({ theme }) => theme.bg2};
  :hover {
    border: 1px solid ${({ theme }) => darken(0.06, theme.bg2)};
  }
`

export const BalanceText = styled(Text)`
  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    flex-shrink: 0;
  `};
`

interface PositionCardProps {
  pair: Pair
  showUnwrapped?: boolean
  border?: string
}

export function MinimalPositionCard({ pair, showUnwrapped = false, border }: PositionCardProps) {
  const { account } = useActiveWeb3React()

  const currency0 = showUnwrapped ? pair.token0 : unwrappedToken(pair.token0)
  const currency1 = showUnwrapped ? pair.token1 : unwrappedToken(pair.token1)

  const [showMore, setShowMore] = useState(false)

  const userPoolBalance = useTokenBalance(account ?? undefined, pair.liquidityToken)
  const totalPoolTokens = useTotalSupply(pair.liquidityToken)

  const [token0Deposited, token1Deposited] =
    !!pair &&
    !!totalPoolTokens &&
    !!userPoolBalance &&
    // this condition is a short-circuit in the case where useTokenBalance updates sooner than useTotalSupply
    JSBI.greaterThanOrEqual(totalPoolTokens.raw, userPoolBalance.raw)
      ? [
          pair.getLiquidityValue(pair.token0, totalPoolTokens, userPoolBalance, false),
          pair.getLiquidityValue(pair.token1, totalPoolTokens, userPoolBalance, false)
        ]
      : [undefined, undefined]

  return (
    <>
      {userPoolBalance && (
        <GreyCard border={border}>
          <AutoColumn gap="12px">
            <FixedHeightRow>
              <RowFixed>
                <Text fontWeight={500} fontSize={16}>
                  Your position
                </Text>
              </RowFixed>
            </FixedHeightRow>
            <FixedHeightRow onClick={() => setShowMore(!showMore)}>
              <RowFixed>
                <DoubleCurrencyLogo currency0={currency0} currency1={currency1} margin={true} size={20} />
                <Text fontWeight={500} fontSize={20}>
                  {currency0.symbol}/{currency1.symbol}
                </Text>
              </RowFixed>
              <RowFixed>
                <Text fontWeight={500} fontSize={20}>
                  {userPoolBalance ? userPoolBalance.toSignificant(4) : '-'}
                </Text>
              </RowFixed>
            </FixedHeightRow>
            <AutoColumn gap="4px">
              <FixedHeightRow>
                <Text color="#888D9B" fontSize={16} fontWeight={500}>
                  {currency0.symbol}:
                </Text>
                {token0Deposited ? (
                  <RowFixed>
                    <Text color="#888D9B" fontSize={16} fontWeight={500} marginLeft={'6px'}>
                      {token0Deposited?.toSignificant(6)}
                    </Text>
                  </RowFixed>
                ) : (
                  '-'
                )}
              </FixedHeightRow>
              <FixedHeightRow>
                <Text color="#888D9B" fontSize={16} fontWeight={500}>
                  {currency1.symbol}:
                </Text>
                {token1Deposited ? (
                  <RowFixed>
                    <Text color="#888D9B" fontSize={16} fontWeight={500} marginLeft={'6px'}>
                      {token1Deposited?.toSignificant(6)}
                    </Text>
                  </RowFixed>
                ) : (
                  '-'
                )}
              </FixedHeightRow>
            </AutoColumn>
          </AutoColumn>
        </GreyCard>
      )}
    </>
  )
}

export default function FullPositionCard({ pair, border }: PositionCardProps) {
  const { account, chainId } = useActiveWeb3React()

  const currency0 = unwrappedToken(pair.token0)
  const currency1 = unwrappedToken(pair.token1)

  const [showMore, setShowMore] = useState(false)

  const userPoolBalance = useTokenBalance(account ?? undefined, pair.liquidityToken)
  const totalPoolTokens = useTotalSupply(pair.liquidityToken)

  const poolTokenPercentage =
    !!userPoolBalance && !!totalPoolTokens && JSBI.greaterThanOrEqual(totalPoolTokens.raw, userPoolBalance.raw)
      ? new Percent(userPoolBalance.raw, totalPoolTokens.raw)
      : undefined

  const [token0Deposited, token1Deposited] =
    !!pair &&
    !!totalPoolTokens &&
    !!userPoolBalance &&
    // this condition is a short-circuit in the case where useTokenBalance updates sooner than useTotalSupply
    JSBI.greaterThanOrEqual(totalPoolTokens.raw, userPoolBalance.raw)
      ? [
          pair.getLiquidityValue(pair.token0, totalPoolTokens, userPoolBalance, false),
          pair.getLiquidityValue(pair.token1, totalPoolTokens, userPoolBalance, false)
        ]
      : [undefined, undefined]

  return (
    <HoverCard border={border}>
      <AutoColumn gap="12px">
        <FixedHeightRow onClick={() => setShowMore(!showMore)} style={{ cursor: 'pointer' }}>
          <RowFixed>
            <DoubleCurrencyLogo currency0={currency0} currency1={currency1} margin={true} size={20} />
            <Text fontWeight={500} fontSize={20}>
              {!currency0 || !currency1 ? <Dots>Loading</Dots> : `${currency0.symbol}/${currency1.symbol}`}
            </Text>
          </RowFixed>
          <RowFixed>
            <ButtonSecondary onClick={() => setShowMore(!showMore)} style={{ paddingLeft: 10 }}>
              Stake
            </ButtonSecondary>
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
                  Pooled {currency0.symbol}:
                </Text>
              </RowFixed>
              {token0Deposited ? (
                <RowFixed>
                  <Text fontSize={16} fontWeight={500} marginLeft={'6px'}>
                    {token0Deposited?.toSignificant(6)}
                  </Text>
                  <CurrencyLogo size="20px" style={{ marginLeft: '8px' }} currency={currency0} />
                </RowFixed>
              ) : (
                '-'
              )}
            </FixedHeightRow>

            <FixedHeightRow>
              <RowFixed>
                <Text fontSize={16} fontWeight={500}>
                  Pooled {currency1.symbol}:
                </Text>
              </RowFixed>
              {token1Deposited ? (
                <RowFixed>
                  <Text fontSize={16} fontWeight={500} marginLeft={'6px'}>
                    {token1Deposited?.toSignificant(6)}
                  </Text>
                  <CurrencyLogo size="20px" style={{ marginLeft: '8px' }} currency={currency1} />
                </RowFixed>
              ) : (
                '-'
              )}
            </FixedHeightRow>
            <FixedHeightRow>
              <Text fontSize={16} fontWeight={500}>
                Your pool tokens:
              </Text>
              <Text fontSize={16} fontWeight={500}>
                {userPoolBalance ? userPoolBalance.toSignificant(4) : '-'}
              </Text>
            </FixedHeightRow>
            <FixedHeightRow>
              <Text fontSize={16} fontWeight={500}>
                Your pool share:
              </Text>
              <Text fontSize={16} fontWeight={500}>
                {poolTokenPercentage ? poolTokenPercentage.toFixed(4) + '%' : '-'}
              </Text>
            </FixedHeightRow>

            <AutoRow justify="center" marginTop={'10px'}>
              {chainId && (
                <ExternalLink href={getEtherscanLink(chainId, pair.liquidityToken.address, 'address')}>
                  View Liquidity Pool Contract ↗
                </ExternalLink>
              )}
            </AutoRow>
            <RowBetween marginTop="10px">
              <ButtonSecondary as={Link} to={`/add/${currencyId(currency0)}/${currencyId(currency1)}`} width="48%">
                Add
              </ButtonSecondary>
              <ButtonSecondary as={Link} width="48%" to={`/remove/${currencyId(currency0)}/${currencyId(currency1)}`}>
                Remove
              </ButtonSecondary>
            </RowBetween>
          </AutoColumn>
        )}
      </AutoColumn>
    </HoverCard>
  )
}

export interface PairFarmablePool {
  pair: Pair
  farmablePool: FarmablePool
}

interface ChefCardProps {
  pairFarmablePool: UserInfoPairFarmablePool
  unstakedLPAmount?: TokenAmount | undefined | null
  showUnwrapped?: boolean
  border?: string
}

export function ChefPositionCard({ pairFarmablePool, unstakedLPAmount, border }: ChefCardProps) {
  const theme = useContext(ThemeContext)
  const { chainId } = useActiveWeb3React()
  const { pair, stakedAmount, pendingReward, farmablePool } = pairFarmablePool

  const currency0 = unwrappedToken(pair.token0)
  const currency1 = unwrappedToken(pair.token1)
  const rewardCurrency = unwrappedToken(pendingReward.token)

  const totalPoolTokens = useStakedAmount(pair.liquidityToken)

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
            <DoubleCurrencyLogo currency0={currency0} currency1={currency1} margin={true} size={20} />
            <Text fontWeight={500} fontSize={20}>
              {!currency0 || !currency1 ? <Dots>Loading</Dots> : `${currency0.symbol}/${currency1.symbol}`}
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
                <ExternalLink href={getEtherscanLink(chainId, pair.liquidityToken.address, 'address')}>
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
