import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useStore } from 'zustand'
import { singletonGameStore } from '../store/gameStore'
import { GameStoreProvider } from '../context/GameStoreContext'
import { AppHeader } from '../components/AppHeader'
import type { ZoneId } from '../types/game'
import { LeftPanel } from '../components/simulator/LeftPanel'
import { CenterField } from '../components/simulator/CenterField'
import { RightPanel } from '../components/simulator/RightPanel'
import { PhaseBar } from '../components/simulator/PhaseBar'
import { ContextMenu } from '../components/simulator/ContextMenu'
import { CardPreviewOverlay } from '../components/simulator/CardPreviewOverlay'
import { DeckTopModal } from '../components/simulator/DeckTopModal'

const VALID_ZONES: ZoneId[] = [
  'deck', 'hand', 'leader', 'field', 'stage',
  'graveyard', 'life', 'opp_field',
]

export function Simulator() {
  const { deckId } = useParams<{ deckId: string }>()
  const navigate = useNavigate()

  const initialized = useStore(singletonGameStore, (s) => s.initialized)
  const loading = useStore(singletonGameStore, (s) => s.loading)
  const error = useStore(singletonGameStore, (s) => s.error)

  useEffect(() => {
    if (!deckId) return
    const id = parseInt(deckId, 10)
    if (isNaN(id)) return
    singletonGameStore.getState().initGame(id)
  }, [deckId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const { endTurn, drawCard, refreshAll, undo, redo, closeContextMenu, setPreview, deckTopModal } =
        singletonGameStore.getState()

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
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const instanceId = active.id as string
    const { moveCard, returnDon } = singletonGameStore.getState()

    if (over.id === 'don_return') {
      returnDon(instanceId)
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

    moveCard(instanceId, toZone, opts)
  }

  if (loading) {
    return (
      <div className="sim-loading">
        <div className="sim-loading__spinner" />
        <div>デッキを読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="sim-error">
        <div>エラー: {error}</div>
        <button className="btn btn--primary" onClick={() => navigate('/')}>
          デッキ一覧へ戻る
        </button>
      </div>
    )
  }

  if (!initialized) {
    return <div className="sim-loading">準備中...</div>
  }

  return (
    <GameStoreProvider store={singletonGameStore}>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="sim-root" onContextMenu={(e) => e.preventDefault()}>
          <AppHeader back={{ to: '/decks', label: '一覧' }} />
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
