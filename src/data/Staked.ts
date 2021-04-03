import { Fraction, Token, TokenAmount } from 'uniswap-xdai-sdk'
import { Contract } from '@ethersproject/contracts'
import { BigNumber } from '@ethersproject/bignumber'

import { useMemo } from 'react'

import { useBaoContract, useLPContract, useMasterChefContract, useWETHContract } from '../hooks/useContract'
import { useSingleCallResult } from '../state/multicall/hooks'
import { FarmablePool } from '../bao/lib/constants'
import { XDAI_WETH } from '../constants'
import { useActiveWeb3React } from '../hooks'
import { useRewardToken } from './Reserves'

export function useTotalLiquidityAmount(token?: Token, contract?: Contract): TokenAmount | undefined {
  const balance = useSingleCallResult(contract, 'balanceOf', [contract?.address]).result?.[0]

  return useMemo(() => (contract && token && balance ? new TokenAmount(token, balance?.toString()) : undefined), [
    token,
    balance,
    contract
  ])
}

export function useStakedAmount(token: Token): TokenAmount | undefined {
  const masterChefContract = useMasterChefContract()
  const contract = useLPContract(token.address) || null
  const balance = useSingleCallResult(contract, 'balanceOf', [masterChefContract?.address]).result?.[0]

  return useMemo(() => (contract && token && balance ? new TokenAmount(token, balance?.toString()) : undefined), [
    token,
    balance,
    contract
  ])
}

export function useUserStakedBalance(lpToken?: Token, farmablePool?: FarmablePool): TokenAmount | undefined {
  const masterChefContract = useMasterChefContract()
  const { account } = useActiveWeb3React()
  const userStakedBalance = useSingleCallResult(masterChefContract, 'userInfo', [
    farmablePool?.pid ?? undefined,
    account ?? undefined
  ]).result?.[0]

  return useMemo(
    () =>
      lpToken && farmablePool && userStakedBalance
        ? new TokenAmount(lpToken, userStakedBalance?.toString())
        : undefined,
    [lpToken, farmablePool, userStakedBalance]
  )
}

// see: useTotalSupply(token?:)

export function usePoolWeightFraction(farmablePool?: FarmablePool): Fraction | undefined {
  const masterChefContract = useMasterChefContract()
  const allocPoint: string = useSingleCallResult(masterChefContract, 'poolInfo', [farmablePool?.pid]).result?.[1]
  const totalAllocPoint: string = useSingleCallResult(masterChefContract, 'totalAllocPoint').result?.[0]

  return useMemo(() => (allocPoint && totalAllocPoint ? new Fraction(allocPoint, totalAllocPoint) : undefined), [
    allocPoint,
    totalAllocPoint
  ])
}

export function useContractWETHBalance(contract?: Contract): TokenAmount | undefined {
  const wethContract = useWETHContract() // native wrapped chain currency
  const wethBalance = useSingleCallResult(wethContract, 'balanceOf', [contract?.address]).result?.[0]
  const tokenAddress = contract?.address

  return useMemo(
    () => (tokenAddress && wethBalance ? new TokenAmount(XDAI_WETH, wethBalance?.toString()) : undefined),
    [tokenAddress, wethBalance]
  )
}

// TODO: oracle/ABI doesn't work
export function useBaoPrice(): BigNumber {
  // const baoPriceContract = useBaoPriceContract()
  // const baoPriceRaw = useSingleCallResult(baoPriceContract, 'consult', [
  //   '0xdcf3aC78f37098222C53C79974faaC5ce1aaF707'.toString(),
  //   1
  // ]).result
  // console.log(baoPriceRaw, 'baoPriceRaw')
  return BigNumber.from('0')
}

// export function useHttpPrices(ids: string[] | undefined = ['weth', 'bao-finance'], base: string | undefined = 'usd'): BigNumber {
//   useCallback(async )
//   const commaSeparatedPrices = ids.join(',')
//   const httpResponse = fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${commaSeparatedPrices}&vs_currencies=base`, {
//     "headers": {
//       "accept": "application/json"
//     }
//   })
//   httpResponse.map()
// }

export interface StakedValue {
  tokenAmount: BigNumber
  wethAmount: BigNumber
  totalWethValue: BigNumber
  tokenPriceInWeth: BigNumber
  poolWeight: BigNumber
}

export function useLockedEarned(): TokenAmount {
  const rewardToken = useRewardToken()
  const { account } = useActiveWeb3React()
  const baoContract = useBaoContract()

  const result = useSingleCallResult(baoContract, 'lockOf', [account ?? undefined]).result?.[0]

  return useMemo(() => new TokenAmount(rewardToken, result ?? '0'), [rewardToken, result])
}
