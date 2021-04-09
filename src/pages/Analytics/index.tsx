import React, { RefObject, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { ThemeContext } from 'styled-components'
import { SwapPoolTabs } from '../../components/NavigationTabs'

import Question from '../../components/QuestionHelper'
import { TYPE } from '../../theme'
import { Text } from 'rebass'
import { LightCard } from '../../components/Card'
import { RowBetween } from '../../components/Row'
import { AutoColumn } from '../../components/Column'
import { SearchInput } from './styleds'

import { useActiveWeb3React } from '../../hooks'
import { Dots } from '../../components/swap/styleds'
import { useAllFarmablePools } from '../../constants/bao'
import { FarmAnalyticsCard } from '../../components/FarmAnalyticsCard'
import { usePoolInfoFarmablePools } from '../../data/Reserves'
import { useTranslation } from 'react-i18next'
import {
  useAllAPYs,
  useAllNewRewardPerBlock,
  useAllPriceOracleDescriptors,
  useAllStakedTVL,
  useBaoUsdPrice
} from '../../hooks/TVL'
import AppBody from '../AppBody'
import useDebounce from '../../hooks/useDebounce'

export default function Analytics() {
  const { t } = useTranslation()
  const theme = useContext(ThemeContext)
  const { active } = useActiveWeb3React()

  const allFarmablePools = useAllFarmablePools()
  const allNewRewardPerBlock = useAllNewRewardPerBlock(allFarmablePools)
  const [poolInfo, fetchingPoolInfo] = usePoolInfoFarmablePools(allFarmablePools, allNewRewardPerBlock)

  const [searchQuery, setSearchQuery] = useState('')

  const query = useDebounce(
    useMemo(() => searchQuery.toLowerCase(), [searchQuery]),
    200
  )

  // manage focus on modal show
  const inputRef = useRef<HTMLInputElement>()
  const handleInput = useCallback(event => {
    const input = event.target.value
    setSearchQuery(input)
  }, [])

  const baoPriceUsd = useBaoUsdPrice()

  const allPriceOracles = useAllPriceOracleDescriptors(poolInfo)

  const allStakedTVL = useAllStakedTVL(poolInfo, allPriceOracles, baoPriceUsd)

  const allAPYs = useAllAPYs(poolInfo, baoPriceUsd, allNewRewardPerBlock, allStakedTVL)

  const isLoading = fetchingPoolInfo
  return (
    <AppBody>
      <SwapPoolTabs active={'analytics'} />
      <AutoColumn gap="lg" justify="center">
        <AutoColumn gap="12px" style={{ width: '100%' }}>
          <RowBetween padding={'0 8px'}>
            <Text color={theme.text1} fontWeight={500}>
              Farmable Pool Analytics
            </Text>
            <Question text="Analytics about all farmable pools" />
          </RowBetween>
          <SearchInput
            type="text"
            id="pool-search-input"
            placeholder={t('poolSearchPlaceholder')}
            value={searchQuery}
            ref={inputRef as RefObject<HTMLInputElement>}
            onChange={handleInput}
            disabled={fetchingPoolInfo}
          />
          {!active ? (
            <LightCard padding="40px">
              <TYPE.body color={theme.text3} textAlign="center">
                Connect to a wallet to view farmable pools.
              </TYPE.body>
            </LightCard>
          ) : isLoading ? (
            <LightCard padding="40px">
              <TYPE.body color={theme.text3} textAlign="center">
                <Dots>Loading</Dots>
              </TYPE.body>
            </LightCard>
          ) : poolInfo.length > 0 ? (
            <>
              {poolInfo.map((farm, i) => {
                const included =
                  farm.symbol
                    .split(' ')[0]
                    .toLowerCase()
                    .includes(query) || farm.name.toLowerCase().includes(query)
                return included ? (
                  <FarmAnalyticsCard
                    key={`analytics-${farm.address}`}
                    farmablePool={farm}
                    apy={allAPYs[i]}
                    defaultShowMore={false}
                  />
                ) : (
                  ''
                )
              })}
            </>
          ) : (
            <LightCard padding="40px">
              <TYPE.body color={theme.text3} textAlign="center">
                No unstaked liquidity found.
              </TYPE.body>
            </LightCard>
          )}
        </AutoColumn>
      </AutoColumn>
    </AppBody>
  )
}
