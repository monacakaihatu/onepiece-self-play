import type { DeckCardItem } from './types'

export const CATEGORY_ORDER = ['Character', 'Event', 'Stage'] as const
export const CATEGORY_JP: Record<string, string> = {
  Character: 'キャラ',
  Event: 'イベント',
  Stage: 'ステージ',
}

export function sortDeckCards(cards: DeckCardItem[]): DeckCardItem[] {
  return [...cards].sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.card.category as (typeof CATEGORY_ORDER)[number])
    const catB = CATEGORY_ORDER.indexOf(b.card.category as (typeof CATEGORY_ORDER)[number])
    const catDiff = (catA === -1 ? 99 : catA) - (catB === -1 ? 99 : catB)
    if (catDiff !== 0) return catDiff
    return (a.card.cost ?? 0) - (b.card.cost ?? 0)
  })
}
