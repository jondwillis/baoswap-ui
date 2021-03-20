import { useSelector } from 'react-redux'
import { AppState } from '..'

export function useChefState(): AppState['chef'] {
  return useSelector<AppState, AppState['chef']>(state => state.chef)
}
