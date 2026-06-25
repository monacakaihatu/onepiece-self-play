import type { Card, CardFilters, CardListResponse, DeckDetail, DeckSummary } from '../types'

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw { status: res.status, detail: body.detail ?? 'Unknown error' }
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

function buildQuery(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null) continue
    if (Array.isArray(val)) {
      val.forEach((v) => q.append(key, String(v)))
    } else {
      q.set(key, String(val))
    }
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const api = {
  getCards: (filters: CardFilters = {}): Promise<CardListResponse> =>
    request(`/cards${buildQuery(filters as Record<string, unknown>)}`),

  getCard: (id: string): Promise<Card> => request(`/cards/${encodeURIComponent(id)}`),

  getDecks: (): Promise<DeckSummary[]> => request('/decks'),

  getDeck: (id: number): Promise<DeckDetail> => request(`/decks/${id}`),

  createDeck: (name: string, leader_id: string): Promise<DeckSummary> =>
    request('/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, leader_id }),
    }),

  updateDeck: (id: number, data: { name?: string; leader_id?: string }): Promise<DeckSummary> =>
    request(`/decks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  deleteDeck: (id: number): Promise<void> => request(`/decks/${id}`, { method: 'DELETE' }),

  updateDeckCards: (
    id: number,
    cards: { card_id: string; quantity: number }[],
    save = false,
  ): Promise<DeckDetail> =>
    request(`/decks/${id}/cards`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards, save }),
    }),
}
