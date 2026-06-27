import type { Card } from './index'

export type ZoneId =
  | 'deck'
  | 'hand'
  | 'leader'
  | 'field'
  | 'stage'
  | 'graveyard'
  | 'excluded'
  | 'life'
  | 'opp_field'

export interface GameCard {
  instanceId: string
  card: Card
  zone: ZoneId
  rested: boolean
  faceUp: boolean
  powerMod: number
  donAttached: number
  fieldIndex?: number
}

export type GamePhase = 'refresh' | 'draw' | 'don' | 'main' | 'battle' | 'end'

export const PHASE_LABELS: Record<GamePhase, string> = {
  refresh: 'リフレッシュ',
  draw: 'ドロー',
  don: 'ドン!!',
  main: 'メイン',
  battle: 'バトル',
  end: 'エンド',
}

export interface DonToken {
  id: string
  used: boolean
  attachedTo?: string
}

export interface GameSnapshot {
  cards: Record<string, GameCard>
  donTokens: DonToken[]
  lifeCards: string[]
  deckOrder: string[]
  turnNumber: number
  phase: GamePhase
}
