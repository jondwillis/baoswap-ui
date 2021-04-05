import { useMemo } from 'react'
import { Token, TokenAmount } from 'uniswap-xdai-sdk'
import { useTokenContract } from '../hooks/useContract'
import { useSingleCallResult } from '../state/multicall/hooks'

// returns undefined if input token is undefined, or fails to get token contract,
// or contract total supply cannot be fetched
export function useTotalSupply(token?: Token): TokenAmount | undefined {
  const contract = useTokenContract(token?.address, false)

  const totalSupply: string | undefined = useSingleCallResult(contract, 'totalSupply')?.result?.[0]

  return useMemo(() => (token && totalSupply ? new TokenAmount(token, totalSupply) : undefined), [totalSupply, token])
}
