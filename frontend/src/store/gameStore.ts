import { create } from 'zustand'
import { api } from '../api/client'
import type { GameCard, GamePhase, GameSnapshot, DonToken, ZoneId } from '../types/game'

const MAX_HISTORY = 50
const PHASE_ORDER: GamePhase[] = ['refresh', 'draw', 'don', 'main', 'battle', 'end']

let _idCounter = 0
function nanoid(prefix = 'c'): string {
  return `${prefix}${++_idCounter}-${Math.random().toString(36).slice(2, 7)}`
}

function buildDonTokens(): DonToken[] {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `don-${i}`,
    used: false,
    attachedTo: undefined,
  }))
}

export interface GameStore {
  deckId: number | null
  deckName: string
  turnNumber: number
  phase: GamePhase
  cards: Record<string, GameCard>
  donTokens: DonToken[]
  lifeCards: string[]
  initialized: boolean
  loading: boolean
  error: string | null

  previewCard: GameCard | null
  contextMenu: { instanceId: string; x: number; y: number } | null

  _history: GameSnapshot[]
  _future: GameSnapshot[]

  // Lifecycle
  initGame: (deckId: number) => Promise<void>
  resetGame: () => void

  // History
  _pushSnapshot: () => void
  undo: () => void
  redo: () => void

  // Card movement
  moveCard: (instanceId: string, toZone: ZoneId, opts?: { faceUp?: boolean; fieldIndex?: number; toTop?: boolean }) => void
  moveCards: (instanceIds: string[], toZone: ZoneId) => void

  // Card state
  toggleRest: (instanceId: string) => void
  restAll: () => void
  refreshAll: () => void
  adjustPower: (instanceId: string, delta: number) => void
  resetPower: (instanceId: string) => void

  // Deck ops
  shuffleDeck: () => void
  drawCard: (count?: number) => void
  drawToLife: (count: number) => void

  // Don!!
  gainDon: (count?: number) => void
  attachDon: (donId: string, instanceId: string) => void
  detachDon: (donId: string) => void
  detachAllDon: (instanceId: string) => void
  refreshDon: () => void
  returnDon: (instanceId: string) => void

  // Phase/turn
  nextPhase: () => void
  setPhase: (phase: GamePhase) => void

  // UI
  setPreview: (card: GameCard | null) => void
  openContextMenu: (instanceId: string, x: number, y: number) => void
  closeContextMenu: () => void
}

function snapshot(state: GameStore): GameSnapshot {
  return {
    cards: structuredClone(state.cards),
    donTokens: structuredClone(state.donTokens),
    lifeCards: [...state.lifeCards],
    turnNumber: state.turnNumber,
    phase: state.phase,
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  deckId: null,
  deckName: '',
  turnNumber: 1,
  phase: 'main',
  cards: {},
  donTokens: buildDonTokens(),
  lifeCards: [],
  initialized: false,
  loading: false,
  error: null,
  previewCard: null,
  contextMenu: null,
  _history: [],
  _future: [],

  initGame: async (deckId: number) => {
    set({ loading: true, error: null, initialized: false })
    try {
      const deck = await api.getDeck(deckId)
      const cards: Record<string, GameCard> = {}

      // Leader
      if (deck.leader) {
        const leaderId = nanoid('leader')
        cards[leaderId] = {
          instanceId: leaderId,
          card: deck.leader,
          zone: 'leader',
          rested: false,
          faceUp: true,
          powerMod: 0,
          donAttached: 0,
        }
      }

      // Deck cards (expand quantities)
      const deckInstanceIds: string[] = []
      for (const { card, quantity } of deck.cards) {
        for (let i = 0; i < quantity; i++) {
          const id = nanoid()
          cards[id] = {
            instanceId: id,
            card,
            zone: 'deck',
            rested: false,
            faceUp: false,
            powerMod: 0,
            donAttached: 0,
          }
          deckInstanceIds.push(id)
        }
      }

      // Shuffle deck
      for (let i = deckInstanceIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[deckInstanceIds[i], deckInstanceIds[j]] = [deckInstanceIds[j], deckInstanceIds[i]]
      }

      // Life cards (from top of shuffled deck)
      const lifeCount = deck.leader?.life ? parseInt(deck.leader.life, 10) || 5 : 5
      const lifeCards: string[] = []
      for (let i = 0; i < lifeCount && i < deckInstanceIds.length; i++) {
        const id = deckInstanceIds[i]
        cards[id] = { ...cards[id], zone: 'life', faceUp: false }
        lifeCards.push(id)
      }

      // Remaining go to deck
      for (let i = lifeCount; i < deckInstanceIds.length; i++) {
        const id = deckInstanceIds[i]
        cards[id] = { ...cards[id], zone: 'deck' }
      }

      set({
        deckId,
        deckName: deck.name,
        cards,
        lifeCards,
        donTokens: buildDonTokens(),
        turnNumber: 1,
        phase: 'main',
        initialized: true,
        loading: false,
        _history: [],
        _future: [],
      })

      // Draw starting hand (5 cards)
      get().drawCard(5)
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'detail' in e ? String((e as {detail: unknown}).detail) : '読み込み失敗'
      set({ loading: false, error: msg })
    }
  },

  resetGame: () => {
    const { deckId } = get()
    if (deckId) get().initGame(deckId)
  },

  _pushSnapshot: () => {
    const state = get()
    const snap = snapshot(state)
    set((s) => ({
      _history: [...s._history.slice(-(MAX_HISTORY - 1)), snap],
      _future: [],
    }))
  },

  undo: () => {
    const { _history, _future } = get()
    if (_history.length === 0) return
    const prev = _history[_history.length - 1]
    const current = snapshot(get())
    set({
      ...prev,
      _history: _history.slice(0, -1),
      _future: [current, ..._future],
      previewCard: null,
      contextMenu: null,
    })
  },

  redo: () => {
    const { _history, _future } = get()
    if (_future.length === 0) return
    const next = _future[0]
    const current = snapshot(get())
    set({
      ...next,
      _history: [..._history, current],
      _future: _future.slice(1),
      previewCard: null,
      contextMenu: null,
    })
  },

  moveCard: (instanceId, toZone, opts = {}) => {
    get()._pushSnapshot()
    set((s) => {
      const card = s.cards[instanceId]
      if (!card) return {}

      // Determine faceUp
      const faceUp = opts.faceUp !== undefined ? opts.faceUp : (toZone !== 'deck' && toZone !== 'life')

      // Determine fieldIndex for field zone
      let fieldIndex = opts.fieldIndex
      if (toZone === 'field' && fieldIndex === undefined) {
        const usedIndices = Object.values(s.cards)
          .filter((c) => c.zone === 'field')
          .map((c) => c.fieldIndex ?? 0)
        fieldIndex = 0
        while (usedIndices.includes(fieldIndex)) fieldIndex++
      }

      // Handle lifeCards array
      let newLifeCards = [...s.lifeCards]
      if (card.zone === 'life') {
        newLifeCards = newLifeCards.filter((id) => id !== instanceId)
      }
      if (toZone === 'life') {
        if (opts.toTop) {
          newLifeCards = [instanceId, ...newLifeCards]
        } else {
          newLifeCards = [...newLifeCards, instanceId]
        }
      }

      // Detach don if leaving field
      let newDonTokens = s.donTokens
      if (card.zone === 'field' || card.zone === 'leader') {
        newDonTokens = s.donTokens.map((d) =>
          d.attachedTo === instanceId ? { ...d, used: false, attachedTo: undefined } : d
        )
      }

      return {
        cards: {
          ...s.cards,
          [instanceId]: {
            ...card,
            zone: toZone,
            faceUp,
            fieldIndex: toZone === 'field' ? fieldIndex : undefined,
            rested: toZone === 'field' ? false : card.rested,
            donAttached: (toZone === 'field' || toZone === 'leader') ? card.donAttached : 0,
          },
        },
        lifeCards: newLifeCards,
        donTokens: newDonTokens,
      }
    })
  },

  moveCards: (instanceIds, toZone) => {
    get()._pushSnapshot()
    set((s) => {
      const updates: Record<string, GameCard> = {}
      let fieldIdx = Object.values(s.cards).filter((c) => c.zone === 'field').length
      for (const id of instanceIds) {
        const card = s.cards[id]
        if (!card) continue
        updates[id] = {
          ...card,
          zone: toZone,
          faceUp: toZone !== 'deck' && toZone !== 'life',
          fieldIndex: toZone === 'field' ? fieldIdx++ : undefined,
        }
      }
      return { cards: { ...s.cards, ...updates } }
    })
  },

  toggleRest: (instanceId) => {
    get()._pushSnapshot()
    set((s) => ({
      cards: {
        ...s.cards,
        [instanceId]: { ...s.cards[instanceId], rested: !s.cards[instanceId].rested },
      },
    }))
  },

  restAll: () => {
    get()._pushSnapshot()
    set((s) => {
      const updates: Record<string, GameCard> = {}
      for (const [id, card] of Object.entries(s.cards)) {
        if (card.zone === 'field' || card.zone === 'leader') {
          updates[id] = { ...card, rested: true }
        }
      }
      return { cards: { ...s.cards, ...updates } }
    })
  },

  refreshAll: () => {
    get()._pushSnapshot()
    set((s) => {
      const updates: Record<string, GameCard> = {}
      for (const [id, card] of Object.entries(s.cards)) {
        if (card.rested) {
          updates[id] = { ...card, rested: false }
        }
      }
      return { cards: { ...s.cards, ...updates } }
    })
  },

  adjustPower: (instanceId, delta) => {
    get()._pushSnapshot()
    set((s) => ({
      cards: {
        ...s.cards,
        [instanceId]: { ...s.cards[instanceId], powerMod: s.cards[instanceId].powerMod + delta },
      },
    }))
  },

  resetPower: (instanceId) => {
    get()._pushSnapshot()
    set((s) => ({
      cards: {
        ...s.cards,
        [instanceId]: { ...s.cards[instanceId], powerMod: 0 },
      },
    }))
  },

  shuffleDeck: () => {
    get()._pushSnapshot()
    set((s) => {
      const deckCards = Object.values(s.cards).filter((c) => c.zone === 'deck')
      for (let i = deckCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[deckCards[i], deckCards[j]] = [deckCards[j], deckCards[i]]
      }
      return { cards: { ...s.cards } }
    })
  },

  drawCard: (count = 1) => {
    get()._pushSnapshot()
    set((s) => {
      const deckCards = Object.values(s.cards)
        .filter((c) => c.zone === 'deck')
      if (deckCards.length === 0) return {}
      const toDraw = deckCards.slice(0, count)
      const updates: Record<string, GameCard> = {}
      for (const card of toDraw) {
        updates[card.instanceId] = { ...card, zone: 'hand', faceUp: true }
      }
      return { cards: { ...s.cards, ...updates } }
    })
  },

  drawToLife: (count) => {
    set((s) => {
      const deckCards = Object.values(s.cards).filter((c) => c.zone === 'deck')
      const toDraw = deckCards.slice(0, count)
      const updates: Record<string, GameCard> = {}
      const newLifeCards = [...s.lifeCards]
      for (const card of toDraw) {
        updates[card.instanceId] = { ...card, zone: 'life', faceUp: false }
        newLifeCards.push(card.instanceId)
      }
      return { cards: { ...s.cards, ...updates }, lifeCards: newLifeCards }
    })
  },

  gainDon: (count = 1) => {
    get()._pushSnapshot()
    set((s) => {
      let gained = 0
      const newTokens = s.donTokens.map((d) => {
        if (!d.used && gained < count) {
          gained++
          return { ...d, used: true }
        }
        return d
      })
      return { donTokens: newTokens }
    })
  },

  attachDon: (donId, instanceId) => {
    get()._pushSnapshot()
    set((s) => {
      const card = s.cards[instanceId]
      if (!card) return {}
      const newTokens = s.donTokens.map((d) =>
        d.id === donId ? { ...d, used: true, attachedTo: instanceId } : d
      )
      const donCount = newTokens.filter((d) => d.attachedTo === instanceId).length
      return {
        donTokens: newTokens,
        cards: { ...s.cards, [instanceId]: { ...card, donAttached: donCount } },
      }
    })
  },

  detachDon: (donId) => {
    get()._pushSnapshot()
    set((s) => {
      const token = s.donTokens.find((d) => d.id === donId)
      if (!token?.attachedTo) return {}
      const instanceId = token.attachedTo
      const newTokens = s.donTokens.map((d) =>
        d.id === donId ? { ...d, used: false, attachedTo: undefined } : d
      )
      const donCount = newTokens.filter((d) => d.attachedTo === instanceId).length
      return {
        donTokens: newTokens,
        cards: {
          ...s.cards,
          [instanceId]: { ...s.cards[instanceId], donAttached: donCount },
        },
      }
    })
  },

  detachAllDon: (instanceId) => {
    get()._pushSnapshot()
    set((s) => {
      const newTokens = s.donTokens.map((d) =>
        d.attachedTo === instanceId ? { ...d, used: false, attachedTo: undefined } : d
      )
      return {
        donTokens: newTokens,
        cards: { ...s.cards, [instanceId]: { ...s.cards[instanceId], donAttached: 0 } },
      }
    })
  },

  refreshDon: () => {
    set((s) => ({
      donTokens: s.donTokens.map((d) => ({ ...d, used: false, attachedTo: undefined })),
      cards: (() => {
        const updates: Record<string, GameCard> = {}
        for (const [id, card] of Object.entries(s.cards)) {
          if (card.donAttached > 0) updates[id] = { ...card, donAttached: 0 }
        }
        return { ...s.cards, ...updates }
      })(),
    }))
  },

  returnDon: (instanceId) => {
    get()._pushSnapshot()
    set((s) => {
      const newTokens = s.donTokens.map((d) =>
        d.attachedTo === instanceId ? { ...d, used: false, attachedTo: undefined } : d
      )
      const card = s.cards[instanceId]
      return {
        donTokens: newTokens,
        cards: card ? { ...s.cards, [instanceId]: { ...card, donAttached: 0 } } : s.cards,
      }
    })
  },

  nextPhase: () => {
    get()._pushSnapshot()
    const { phase, turnNumber } = get()
    const idx = PHASE_ORDER.indexOf(phase)

    if (phase === 'end') {
      // Next turn
      const newTurn = turnNumber + 1
      set({ turnNumber: newTurn, phase: 'refresh' })
      get().refreshAll()
      get().refreshDon()
      return
    }

    const next = PHASE_ORDER[idx + 1]
    set({ phase: next })

    if (next === 'draw') {
      get().drawCard(1)
    }
    if (next === 'don') {
      const donCount = Math.min(get().turnNumber + 1, 2)
      get().gainDon(donCount)
    }
  },

  setPhase: (phase) => {
    get()._pushSnapshot()
    set({ phase })
  },

  setPreview: (card) => set({ previewCard: card }),
  openContextMenu: (instanceId, x, y) => set({ contextMenu: { instanceId, x, y } }),
  closeContextMenu: () => set({ contextMenu: null }),
}))
