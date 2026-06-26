export interface Card {
  id: string
  name: string | null
  name_en: string | null
  cost: number | null
  color: string | null
  category: string | null
  power: number | null
  counter: number | null
  effect_text: string | null
  effect_text_en: string | null
  image_url: string | null
  set_code: string | null
  sub_types: string | null
  attribute: string | null
  life: string | null
  rarity: string | null
}

export interface DeckCardItem {
  card: Card
  quantity: number
}

export interface DeckSummary {
  id: number
  name: string
  leader_id: string
  leader: Card | null
  total_cards: number
  created_at: string
  updated_at: string
}

export interface DeckDetail {
  id: number
  name: string
  leader_id: string
  leader: Card | null
  cards: DeckCardItem[]
  total_cards: number
  created_at: string
  updated_at: string
}

export interface CardListResponse {
  total: number
  items: Card[]
}

export interface CardFilters {
  q?: string
  color?: string[]
  cost?: number[]
  category?: string[]
  exclude_category?: string[]
  set_code?: string[]
  rarity?: string[]
  sub_types?: string
  sort?: string
  limit?: number
  offset?: number
}
