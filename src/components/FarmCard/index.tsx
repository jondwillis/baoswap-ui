import React, { useContext, useState } from 'react'
import { ChevronUp, ChevronDown } from 'react-feather'
import { ThemeContext } from 'styled-components'
import { useStakedAmount } from '../../data/Staked'
import { useActiveWeb3React } from '../../hooks'
import { getEtherscanLink } from '../../utils'
import { AutoColumn } from '../Column'
import { HoverCard, FixedHeightRow } from '../PositionCard'
import { RowFixed, AutoRow } from '../Row'
import { Text } from 'rebass'
import { ExternalLink } from '../../theme'
import { PoolInfoFarmablePool } from '../../data/Reserves'

interface FarmCardProps {
  farmablePool: PoolInfoFarmablePool
  border?: string
  defaultShowMore: boolean
}

export function FarmCard({ farmablePool, border, defaultShowMore }: FarmCardProps) {
  const theme = useContext(ThemeContext)
  const { chainId } = useActiveWeb3React()
  // const { stakedAmount, pendingReward } = farmablePool

  // const currency0 = unwrappedToken(pair.token0)
  // const currency1 = unwrappedToken(pair.token1)
  // const rewardCurrency = unwrappedToken(pendingReward.token)

  const totalPoolTokens = useStakedAmount(farmablePool.token)

  const [showMore, setShowMore] = useState(defaultShowMore)

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
                  All Staked (LP):
                </Text>
              </RowFixed>
              <RowFixed>
                <Text fontSize={16} fontWeight={500}>
                  {totalPoolTokens ? totalPoolTokens.toFixed(3) : '-'}
                </Text>
              </RowFixed>
            </FixedHeightRow>

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
