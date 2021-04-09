import { useMemo } from 'react'
import { TokenAmount } from 'uniswap-xdai-sdk'
import { FarmablePool } from '../constants/bao'
import { useTransactionAdder } from '../state/transactions/hooks'
import { useMasterChefContract } from './useContract'

export enum HarvestState {
  UNKNOWN,
  PENDING,
  HARVESTED
}

export function useHarvestAll(
  farmablePools: FarmablePool[]
): { state: HarvestState; callback?: null | (() => Promise<any[]>); error: string | null } {
  const masterChefContract = useMasterChefContract()
  const addTransaction = useTransactionAdder()

  return useMemo(() => {
    return {
      state: HarvestState.PENDING,
      callback:
        masterChefContract &&
        async function onHarvestAll(): Promise<any[]> {
          return await Promise.all(
            farmablePools.map(async farm => {
              const txReceipt = await masterChefContract.claimReward(farm.pid)
              addTransaction(txReceipt, { summary: `Harvest ${farm.name} (Pool ID: ${farm.pid})` })
              const txHash = txReceipt.hash
              return txHash
            })
          ).catch((error: any) => {
            // if the user rejected the tx, pass this along
            if (error?.code === 4001) {
              throw new Error('Transaction rejected.')
            } else {
              // otherwise, the error was unexpected and we need to convey that
              console.error(`Harvest failed`, error)
              throw new Error(`Harvest failed: ${error.message}`)
            }
          })
        },
      error: null
    }
  }, [addTransaction, masterChefContract, farmablePools])
}

export function useStake(
  farmablePool: FarmablePool | undefined,
  amount: TokenAmount | null | undefined
): { callback?: null | (() => Promise<any>) } {
  const masterChefContract = useMasterChefContract()
  const addTransaction = useTransactionAdder()

  return useMemo(() => {
    return {
      callback:
        masterChefContract &&
        farmablePool &&
        amount &&
        async function onStake(): Promise<any> {
          const pid = farmablePool.pid
          const txReceipt = await masterChefContract.deposit(
            pid,
            `0x${amount.raw.toString(16)}`,
            '0x0000000000000000000000000000000000000000'
          )
          addTransaction(txReceipt, { summary: `Stake ${amount.toFixed(4)} in ${farmablePool.name}` })
          const txHash = txReceipt.hash
          return txHash
        }
    }
  }, [addTransaction, masterChefContract, farmablePool, amount])
}

export function useUnstake(
  farmablePool: FarmablePool,
  amount: TokenAmount | null | undefined
): { callback?: null | (() => Promise<any>) } {
  const masterChefContract = useMasterChefContract()
  const addTransaction = useTransactionAdder()

  return useMemo(() => {
    return {
      callback:
        masterChefContract &&
        amount &&
        async function onUnstake(): Promise<any> {
          const pid = farmablePool.pid
          const txReceipt = await masterChefContract.withdraw(
            pid,
            `0x${amount.raw.toString(16)}`,
            '0x0000000000000000000000000000000000000000'
          )
          addTransaction(txReceipt, {
            summary: `Unstake ${amount.toFixed(4)} from ${farmablePool.name}`
          })
          const txHash = txReceipt.hash
          return txHash
        }
    }
  }, [addTransaction, masterChefContract, farmablePool, amount])
}
