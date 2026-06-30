import { createContext, useContext } from 'react'
import type { GameStoreApi } from '../store/gameStoreFactory'

const InactiveStoreContext = createContext<GameStoreApi | null>(null)

export const InactiveStoreProvider = InactiveStoreContext.Provider

export function useInactiveStore(): GameStoreApi | null {
  return useContext(InactiveStoreContext)
}
