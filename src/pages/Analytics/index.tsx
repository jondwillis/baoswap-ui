import React, { useContext } from 'react'
import { ThemeContext } from 'styled-components'
import { SwapPoolTabs } from '../../components/NavigationTabs'

import Question from '../../components/QuestionHelper'
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
            ) : poolInfo?.length > 0 ? (
              <>
                {poolInfo.map(farm => (
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
