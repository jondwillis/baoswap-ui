import React, { useContext, useState } from 'react'
import { ChevronUp, ChevronDown } from 'react-feather'
import { ThemeContext } from 'styled-components'
import { useActiveWeb3React } from '../../hooks'
import { getEtherscanLink } from '../../utils'
import { AutoColumn } from '../Column'
import { HoverCard, FixedHeightRow } from '../PositionCard'
import { RowFixed, AutoRow } from '../Row'
import { Text } from 'rebass'
import { ExternalLink } from '../../theme'
import { PoolInfoFarmablePool } from '../../data/Reserves'
import { JSBI, TokenAmount } from 'uniswap-xdai-sdk'

interface FarmCardProps {
  farmablePool: PoolInfoFarmablePool
  border?: string
  defaultShowMore: boolean
}

export function FarmCard({ farmablePool, border, defaultShowMore }: FarmCardProps) {
  const theme = useContext(ThemeContext)
  const { chainId } = useActiveWeb3React()
  const { accBaoPerShare, totalSupply } = farmablePool

  // const stakedPoolTokens = useStakedAmount(farmablePool.token)

  const score =
    totalSupply &&
    new TokenAmount(
      totalSupply.token,
      JSBI.subtract(JSBI.multiply(accBaoPerShare.raw, totalSupply.raw), JSBI.BigInt(1e12))
    )

  const [showMore, setShowMore] = useState(defaultShowMore)

  return (
    <HoverCard border={border} style={{ backgroundColor: theme.bg2 }}>
      <AutoColumn gap="12px">
        <FixedHeightRow onClick={() => setShowMore(!showMore)} style={{ cursor: 'pointer' }}>
          <RowFixed>
            <Text fontWeight={500} fontSize={20}>
              {farmablePool.name}
            </Text>
            <Text fontWeight={300} fontSize={12}>
              {'  - '}
              {farmablePool.symbol}
            </Text>
          </RowFixed>
          <RowFixed>{score?.toSignificant(8) ?? '-'}</RowFixed>
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
                  {totalSupply ? totalSupply.toSignificant(8) : '-'}
                </Text>
              </RowFixed>
            </FixedHeightRow>

            <FixedHeightRow>
              <RowFixed>
                <Text fontSize={16} fontWeight={500}>
                  Acc Bao/Share:
                </Text>
              </RowFixed>
              <RowFixed>
                <Text fontSize={16} fontWeight={500}>
                  {accBaoPerShare ? accBaoPerShare.toSignificant(8) : '-'}
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
