import { useStore } from 'zustand'
import { createGameStore } from './gameStoreFactory'
import type { GameStore } from './gameStoreFactory'

export type { GameStore } from './gameStoreFactory'
export { createGameStore } from './gameStoreFactory'

// Singleton store for single-player Simulator page
export const singletonGameStore = createGameStore()

type UseGameStore = {
  <T>(selector: (s: GameStore) => T): T
  getState: () => GameStore
}

function _hook<T>(selector: (s: GameStore) => T): T {
  return useStore(singletonGameStore, selector)
}

// Attach .getState() for backward-compat with Simulator.tsx
;(_hook as UseGameStore).getState = () => singletonGameStore.getState()

export const useGameStore = _hook as UseGameStore
