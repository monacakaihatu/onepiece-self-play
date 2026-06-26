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
import { useGameStore } from '../store/gameStore'
import type { ZoneId } from '../types/game'
import { LeftPanel } from '../components/simulator/LeftPanel'
import { CenterField } from '../components/simulator/CenterField'
import { RightPanel } from '../components/simulator/RightPanel'
import { PhaseBar } from '../components/simulator/PhaseBar'
import { ContextMenu } from '../components/simulator/ContextMenu'
import { CardPreviewOverlay } from '../components/simulator/CardPreviewOverlay'

const VALID_ZONES: ZoneId[] = [
  'deck', 'hand', 'leader', 'field', 'stage',
  'graveyard', 'excluded', 'life', 'opp_field',
]

export function Simulator() {
  const { deckId } = useParams<{ deckId: string }>()
  const navigate = useNavigate()
  const initialized = useGameStore((s) => s.initialized)
  const loading = useGameStore((s) => s.loading)
  const error = useGameStore((s) => s.error)
  const { initGame, moveCard, drawCard, refreshAll, nextPhase, undo, redo, closeContextMenu, returnDon } =
    useGameStore.getState()

  useEffect(() => {
    if (!deckId) return
    const id = parseInt(deckId, 10)
    if (isNaN(id)) return
    initGame(id)
  }, [deckId])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.code === 'Space' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        nextPhase()
        return
      }
      if (e.key === 'd' || e.key === 'D') {
        if (!e.ctrlKey && !e.metaKey) {
          drawCard(1)
          return
        }
      }
      if (e.key === 'r' || e.key === 'R') {
        if (!e.ctrlKey && !e.metaKey) {
          refreshAll()
          return
        }
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }
      if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        redo()
        return
      }
      if (e.key === 'Escape') {
        closeContextMenu()
        useGameStore.getState().setPreview(null)
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
    if (toZone === 'excluded') opts.faceUp = true

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
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="sim-root" onContextMenu={(e) => e.preventDefault()}>
        <PhaseBar />
        <div className="sim-board">
          <LeftPanel />
          <CenterField />
          <RightPanel />
        </div>
        <ContextMenu />
        <CardPreviewOverlay />
        <button
          className="btn btn--ghost sim-back-btn"
          onClick={() => navigate('/')}
          title="デッキ一覧へ"
        >
          ← 一覧
        </button>
      </div>
    </DndContext>
  )
}
