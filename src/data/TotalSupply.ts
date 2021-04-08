import { BigNumber } from '@ethersproject/bignumber'
import { useMemo } from 'react'
import { Token, TokenAmount } from 'uniswap-xdai-sdk'
import { useTokenContract } from '../hooks/useContract'
import { useMultipleContractSingleData, useSingleCallResult } from '../state/multicall/hooks'
import ERC20_ABI from '../constants/abis/erc20.json'
import { Interface } from '@ethersproject/abi'

// returns undefined if input token is undefined, or fails to get token contract,
// or contract total supply cannot be fetched
export function useTotalSupply(token?: Token): TokenAmount | undefined {
  const contract = useTokenContract(token?.address, false)

  const totalSupply: BigNumber = useSingleCallResult(contract, 'totalSupply')?.result?.[0]

  return token && totalSupply ? new TokenAmount(token, totalSupply.toString()) : undefined
}

const ERC20_INTERFACE = new Interface(ERC20_ABI)
export function useAllTotalSupply(tokens?: Token[]): (TokenAmount | undefined)[] {
  const tokenAddresses = useMemo(() => tokens?.map(t => t.address), [tokens])
  // const contracts = useLPContracts(tokenAddresses ?? [], false)

  const totalSupplyResults = useMultipleContractSingleData(tokenAddresses ?? [], ERC20_INTERFACE, 'totalSupply')

  return useMemo(() => {
    return totalSupplyResults.map((totalSupplyResult, i) => {
      const token = tokens && tokens[i]
      const totalSupply: string | undefined = totalSupplyResult.result?.[0]
      return token && totalSupply ? new TokenAmount(token, totalSupply) : undefined
    })
  }, [tokens, totalSupplyResults])
}
