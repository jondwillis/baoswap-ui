import { createReducer } from '@reduxjs/toolkit'
import { resetHarvestState } from './actions'

export interface ChefState {
  attemptingHarvest: boolean
  harvestErrorMessage?: string
  harvestTxnHash?: string
}

export const initialChefState: ChefState = {
  attemptingHarvest: false,
  harvestErrorMessage: undefined,
  harvestTxnHash: undefined
}

export default createReducer<ChefState>(initialChefState, builder =>
  builder.addCase(resetHarvestState, () => initialChefState)
)
