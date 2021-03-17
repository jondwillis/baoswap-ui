import { FarmablePool } from "../bao/lib/constants"
// import { useActiveWeb3React } from "."
// import { useMasterChefContract } from "./useContract"
// import { useSingleContractMultipleData } from "../state/multicall/hooks"

export enum HarvestState {
  UNKNOWN,
  PENDING,
  HARVESTED
}

export function useHarvestAll(farmablePools: FarmablePool[]): { state: HarvestState; callback: () => Promise<void> } {
  // const { address } = useActiveWeb3React()
  // const masterChef = useMasterChefContract()
  // const results = useSingleContractMultipleData(masterChefContract, 'userInfo', poolIdsAndLpTokens)
  // useMemo

  console.log('farmablePools', farmablePools)

  return {
    state: HarvestState.PENDING,
    callback: async function onHarvestAll(): Promise<void> {
      Promise.resolve()
    }
  }
}
