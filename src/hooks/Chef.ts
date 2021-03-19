import { useMemo } from 'react'
import { FarmablePool } from '../bao/lib/constants'
import { useTransactionAdder } from '../state/transactions/hooks'
import { useMasterChefContract } from './useContract'

export enum HarvestState {
  UNKNOWN,
  PENDING,
  HARVESTED
}

export function useHarvestAll(
  farmablePools: FarmablePool[]
): { state: HarvestState; callback?: null | (() => Promise<any[]>), error: string | null } {
  const masterChefContract = useMasterChefContract()
  const addTransaction = useTransactionAdder()

  console.log('farmablePools', farmablePools)

  return useMemo(() => {
    return {
      state: HarvestState.PENDING,
      callback:
        masterChefContract &&
        async function onHarvestAll(): Promise<any[]> {
          const pids = farmablePools.map(farm => farm.pid)

          return await Promise.all(
            pids.map(async pid => {
              const txReceipt = await masterChefContract?.claimReward(pid)
              addTransaction(txReceipt, { summary: `Harvest Pool ID: ${pid}` })
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
