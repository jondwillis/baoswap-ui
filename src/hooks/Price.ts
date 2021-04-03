import { useMemo } from 'react'
import { ChainId } from 'uniswap-xdai-sdk'
import { useActiveWeb3React } from '.'
import { FarmablePool, priceOracles } from '../bao/lib/constants'
import { useStakedAmount } from '../data/Staked'
import { useSingleCallResult } from '../state/multicall/hooks'
import { usePriceOracleContract } from './useContract'

export function useTVL(farmablePool: FarmablePool) {
  const { chainId } = useActiveWeb3React()
  const [tokenAddress0, tokenAddress1] = farmablePool.tokenAddress
  const stakedAmount = useStakedAmount(farmablePool.token)
  const chainIdNumber = useMemo(() => (chainId == ChainId.XDAI ? 100 : chainId == 1 ? ChainId.MAINNET : undefined), [
    chainId
  ])
  const priceOraclesForChain = useMemo(() => chainIdNumber && priceOracles[chainIdNumber], [chainIdNumber])
  const priceOracleToken0 = priceOraclesForChain && priceOraclesForChain[tokenAddress0]
  const priceOracleToken1 = priceOraclesForChain && priceOraclesForChain[tokenAddress1]
  const priceOracleContract = usePriceOracleContract(priceOracleToken0 || priceOracleToken1)
  const price = useSingleCallResult(priceOracleContract, 'latestAnswer')
  const decimals = useSingleCallResult(priceOracleContract, 'decimals')

}
