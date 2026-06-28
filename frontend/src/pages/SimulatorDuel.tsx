import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AppLogo } from '../components/AppLogo'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useStore } from 'zustand'
import { createGameStore } from '../store/gameStoreFactory'
import type { GameStoreApi } from '../store/gameStoreFactory'
import { GameStoreProvider } from '../context/GameStoreContext'
import type { ZoneId, GameCard } from '../types/game'
import { LeftPanel } from '../components/simulator/LeftPanel'
import { CenterField } from '../components/simulator/CenterField'
import { RightPanel } from '../components/simulator/RightPanel'
import { PhaseBar } from '../components/simulator/PhaseBar'
import { ContextMenu } from '../components/simulator/ContextMenu'
import { CardPreviewOverlay } from '../components/simulator/CardPreviewOverlay'
import { DeckTopModal } from '../components/simulator/DeckTopModal'

const VALID_ZONES: ZoneId[] = [
  'deck', 'hand', 'leader', 'field', 'stage',
  'graveyard', 'excluded', 'life', 'opp_field',
]

// Simple card image for mulligan screen (no dnd)
function MulliganCard({ card }: { card: GameCard }) {
  return (
    <div className="mulligan-card">
      {card.faceUp ? (
        <img
          src={`/image/${card.card.id}`}
          alt={card.card.name ?? card.card.name_en ?? card.card.id}
          className="mulligan-card__img"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = '/placeholder.png'
          }}
        />
      ) : (
        <div className="mulligan-card__back" />
      )}
    </div>
  )
}

function MulliganPanel({
  store,
  label,
  order,
  kept,
  onMulligan,
  onKeep,
}: {
  store: GameStoreApi
  label: string
  order: '先行' | '後攻'
  kept: boolean
  onMulligan: () => void
  onKeep: () => void
}) {
  const cards = useStore(store, (s) => s.cards)
  const deckName = useStore(store, (s) => s.deckName)
  const initialized = useStore(store, (s) => s.initialized)
  const loading = useStore(store, (s) => s.loading)

  const handCards = Object.values(cards).filter((c) => c.zone === 'hand')

  return (
    <div className={`mulligan-panel ${kept ? 'mulligan-panel--kept' : ''}`}>
      <div className="mulligan-panel__header">
        <span className="mulligan-panel__label">{label}</span>
        <span className="mulligan-panel__deck">{deckName}</span>
        <span className={`mulligan-panel__order mulligan-order--${order === '先行' ? 'first' : 'second'}`}>
          {order}
        </span>
      </div>

      <div className="mulligan-panel__hand">
        {loading && <div className="mulligan-loading">読み込み中...</div>}
        {initialized &&
          handCards.map((card) => <MulliganCard key={card.instanceId} card={card} />)}
        {initialized && handCards.length === 0 && (
          <div className="mulligan-empty">手札なし</div>
        )}
      </div>

      <div className="mulligan-panel__footer">
        {kept ? (
          <div className="mulligan-kept-badge">キープ ✓</div>
        ) : (
          <>
            <button className="btn" onClick={onMulligan} disabled={!initialized}>
              マリガン
            </button>
            <button className="btn btn--primary" onClick={onKeep} disabled={!initialized}>
              キープ
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function GameBoard({
  store,
  onDragEnd,
}: {
  store: GameStoreApi
  onDragEnd: (e: DragEndEvent) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  return (
    <GameStoreProvider store={store}>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="sim-root" onContextMenu={(e) => e.preventDefault()}>
          <PhaseBar />
          <div className="sim-board">
            <LeftPanel />
            <CenterField />
            <RightPanel />
          </div>
          <ContextMenu />
          <CardPreviewOverlay />
          <DeckTopModal />
        </div>
      </DndContext>
    </GameStoreProvider>
  )
}

export function SimulatorDuel() {
  const { firstId, secondId } = useParams<{ firstId: string; secondId: string }>()
  const navigate = useNavigate()

  // Create two independent stores (stable across renders)
  const storeFirstRef = useRef<GameStoreApi | null>(null)
  const storeSecondRef = useRef<GameStoreApi | null>(null)
  if (!storeFirstRef.current) storeFirstRef.current = createGameStore()
  if (!storeSecondRef.current) storeSecondRef.current = createGameStore()

  const storeFirst = storeFirstRef.current
  const storeSecond = storeSecondRef.current

  const [phase, setPhase] = useState<'mulligan' | 'game'>('mulligan')
  const [keptFirst, setKeptFirst] = useState(false)
  const [keptSecond, setKeptSecond] = useState(false)
  const [activePlayer, setActivePlayer] = useState<'first' | 'second'>('first')

  const firstInitialized = useStore(storeFirst, (s) => s.initialized)
  const secondInitialized = useStore(storeSecond, (s) => s.initialized)
  const firstDeckName = useStore(storeFirst, (s) => s.deckName)
  const secondDeckName = useStore(storeSecond, (s) => s.deckName)

  // Load both decks
  useEffect(() => {
    if (!firstId || !secondId) return
    const idA = parseInt(firstId, 10)
    const idB = parseInt(secondId, 10)
    if (isNaN(idA) || isNaN(idB)) return
    storeFirst.getState().initGame(idA)
    storeSecond.getState().initGame(idB)
  }, [firstId, secondId])

  // When both kept → go to game
  useEffect(() => {
    if (keptFirst && keptSecond) {
      setPhase('game')
    }
  }, [keptFirst, keptSecond])

  // Keyboard shortcuts for active player
  useEffect(() => {
    if (phase !== 'game') return
    const activeStore = activePlayer === 'first' ? storeFirst : storeSecond

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const { endTurn, drawCard, refreshAll, undo, redo, closeContextMenu, setPreview, deckTopModal } =
        activeStore.getState()

      // Block most actions while the deck-peek modal is open
      if (deckTopModal) return

      if (e.code === 'Space' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        endTurn()
        return
      }
      if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey) {
        drawCard(1)
        return
      }
      if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
        refreshAll()
        return
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        e.shiftKey ? redo() : undo()
        return
      }
      if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        redo()
        return
      }
      if (e.key === 'Escape') {
        closeContextMenu()
        setPreview(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, activePlayer])

  const makeDragHandler = (store: GameStoreApi) => (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const instanceId = active.id as string

    if (over.id === 'don_return') {
      store.getState().returnDon(instanceId)
      return
    }

    const toZone = over.id as ZoneId
    if (!VALID_ZONES.includes(toZone)) return

    const sourceZone = (active.data.current as { zone?: ZoneId })?.zone
    if (sourceZone === toZone && toZone !== 'field') return

    const opts: { faceUp?: boolean; toTop?: boolean } = {}
    if (toZone === 'deck') opts.toTop = false
    if (toZone === 'hand') opts.faceUp = true
    if (toZone === 'graveyard') opts.faceUp = true
    if (toZone === 'excluded') opts.faceUp = true

    store.getState().moveCard(instanceId, toZone, opts)
  }

  const bothLoading = !firstInitialized || !secondInitialized

  if (phase === 'mulligan') {
    return (
      <div className="duel-mulligan-page">
        <header className="duel-header">
          <Link to="/" className="app-header__brand duel-brand">
            <AppLogo size={22} />
            <span className="app-header__brand-name">VIVRE</span>
          </Link>
          <div className="app-header__sep" />
          <button className="btn btn--ghost" onClick={() => navigate('/simulate')}>
            ← セットアップへ
          </button>
          <h1 className="duel-header__title">マリガン</h1>
          <div className="duel-header__hint">
            {bothLoading ? 'デッキを読み込み中...' : '手札を確認して、マリガンかキープを選択してください（何回でも可）'}
          </div>
        </header>

        <div className="duel-mulligan-panels">
          <MulliganPanel
            store={storeFirst}
            label="プレイヤー A"
            order="先行"
            kept={keptFirst}
            onMulligan={() => storeFirst.getState().mulligan()}
            onKeep={() => setKeptFirst(true)}
          />
          <MulliganPanel
            store={storeSecond}
            label="プレイヤー B"
            order="後攻"
            kept={keptSecond}
            onMulligan={() => storeSecond.getState().mulligan()}
            onKeep={() => setKeptSecond(true)}
          />
        </div>

        {keptFirst && keptSecond && (
          <div className="duel-mulligan-start">
            <div className="duel-mulligan-start__text">両プレイヤーがキープしました</div>
            <button
              className="btn btn--primary btn--lg"
              onClick={() => setPhase('game')}
            >
              ゲーム開始 →
            </button>
          </div>
        )}
      </div>
    )
  }

  // Game phase
  const activeStore = activePlayer === 'first' ? storeFirst : storeSecond
  const activeName = activePlayer === 'first' ? firstDeckName : secondDeckName
  const activeOrder = activePlayer === 'first' ? '先行' : '後攻'
  const inactiveName = activePlayer === 'first' ? secondDeckName : firstDeckName
  const inactiveOrder = activePlayer === 'first' ? '後攻' : '先行'

  return (
    <div className="duel-game-page">
      <header className="duel-tab-bar">
        <Link to="/" className="app-header__brand duel-brand">
          <AppLogo size={22} />
          <span className="app-header__brand-name">VIVRE</span>
        </Link>
        <div className="app-header__sep" />
        <button className="btn btn--ghost duel-tab-bar__back" onClick={() => navigate('/simulate')}>
          ← 終了
        </button>

        <div className="duel-tabs">
          <button
            className={`duel-tab ${activePlayer === 'first' ? 'duel-tab--active' : ''}`}
            onClick={() => setActivePlayer('first')}
          >
            <span className="duel-tab__order duel-tab__order--first">先行</span>
            <span className="duel-tab__name">{firstDeckName}</span>
          </button>
          <button
            className={`duel-tab ${activePlayer === 'second' ? 'duel-tab--active' : ''}`}
            onClick={() => setActivePlayer('second')}
          >
            <span className="duel-tab__order duel-tab__order--second">後攻</span>
            <span className="duel-tab__name">{secondDeckName}</span>
          </button>
        </div>

        <div className="duel-active-indicator">
          <span className="duel-active-indicator__label">操作中:</span>
          <span className="duel-active-indicator__name">{activeName}</span>
          <span className={`duel-active-indicator__order duel-tab__order--${activePlayer === 'first' ? 'first' : 'second'}`}>
            {activeOrder}
          </span>
        </div>

        <div className="duel-inactive-info">
          <span className="duel-inactive-info__label">待機:</span>
          <span className="duel-inactive-info__name">{inactiveName}</span>
          <span className="duel-inactive-info__order">{inactiveOrder}</span>
        </div>
      </header>

      <div className="duel-board-wrap">
        <GameBoard
          store={activeStore}
          onDragEnd={makeDragHandler(activeStore)}
        />
      </div>
    </div>
  )
}
