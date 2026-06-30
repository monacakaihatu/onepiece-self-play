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

export interface DonToken {
  id: string
  used: boolean
  rested: boolean
  attachedTo?: string
}

export interface DeckTopModal {
  peekedIds: string[]
}

export interface GameSnapshot {
  cards: Record<string, GameCard>
  donTokens: DonToken[]
  lifeCards: string[]
  deckOrder: string[]
  turnNumber: number
}
