import React, { useContext, useState } from 'react'
import { ThemeContext } from 'styled-components'
import { SwapPoolTabs } from '../../components/NavigationTabs'

import Question from '../../components/QuestionHelper'
import SearchInput from '../../components/SearchInput'
import { TYPE } from '../../theme'
import { Text } from 'rebass'
import { LightCard } from '../../components/Card'
import { RowBetween } from '../../components/Row'
import { AutoColumn } from '../../components/Column'

import { useActiveWeb3React } from '../../hooks'
import AppBody from '../AppBody'
import { Dots } from '../../components/swap/styleds'
import { useAllFarmablePools } from '../../bao/lib/constants'
import { FarmCard } from '../../components/FarmCard'
import { usePoolInfoFarmablePools } from '../../data/Reserves'

export default function Analytics() {
  const theme = useContext(ThemeContext)
  const { account } = useActiveWeb3React()

  const allFarmablePools = useAllFarmablePools()
  const [poolInfo, fetchingPoolInfo] = usePoolInfoFarmablePools(allFarmablePools)

  const [searchQuery, setSearchQuery] = useState('')

  const queriedPools: any = []
  poolInfo.forEach((pool) => {
    const queryLowerCase = searchQuery.toLowerCase()
    if (pool.symbol.toLowerCase().includes(queryLowerCase) ||
        pool.name.toLowerCase().includes(queryLowerCase))
      queriedPools.push(pool)
  })
  const updateSearchQuery = (event: any) => setSearchQuery(event.target.value)

  const isLoading = fetchingPoolInfo
  return (
    <>
      <AppBody>
        <SwapPoolTabs active={'analytics'} />
        <AutoColumn gap="lg" justify="center">
          <AutoColumn gap="12px" style={{ width: '100%' }}>
            <RowBetween padding={'0 8px'}>
              <Text color={theme.text1} fontWeight={500}>
                All Farmable Pools (Work in Progress)
              </Text>
              <Question text="Analytics about all farmable pools" />
            </RowBetween>

            <SearchInput onChange={updateSearchQuery} placeholder='Search Pools'></SearchInput>
            {!account ? (
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
            ) : queriedPools?.length > 0 ? (
              <>
                {queriedPools.map((farm: any) => (
                  <FarmCard key={farm.address} farmablePool={farm} defaultShowMore={false} />
                ))}
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
    </>
  )
}
