import { createContext, useContext, type ReactNode } from 'react'
import { useStore } from 'zustand'
import type { GameStore, GameStoreApi } from '../store/gameStoreFactory'

export const GameStoreContext = createContext<GameStoreApi | null>(null)

export function useGameStore<T>(selector: (s: GameStore) => T): T {
  const store = useContext(GameStoreContext)
  if (!store) throw new Error('useGameStore must be used inside <GameStoreProvider>')
  return useStore(store, selector)
}

export function GameStoreProvider({
  store,
  children,
}: {
  store: GameStoreApi
  children: ReactNode
}) {
  return <GameStoreContext.Provider value={store}>{children}</GameStoreContext.Provider>
}
