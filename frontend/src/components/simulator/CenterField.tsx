import { useDroppable } from '@dnd-kit/core'
import { AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../context/GameStoreContext'
import { GameCardDisplay } from './GameCardDisplay'
import { DonZone } from './DonZone'

function LeaderArea() {
  const cards = useGameStore((s) => s.cards)
  const { setNodeRef, isOver } = useDroppable({ id: 'leader' })
  const leader = Object.values(cards).find((c) => c.zone === 'leader')

  return (
    <div ref={setNodeRef} className={`sim-leader-area ${isOver ? 'sim-zone--over' : ''}`}>
      <div className="sim-zone-label">リーダー</div>
      {leader ? (
        <div className="sim-leader-card">
          <GameCardDisplay gameCard={leader} size="lg" showPower={true} />
          {leader.card.life && <div className="sim-leader-life">LIFE: {leader.card.life}</div>}
        </div>
      ) : (
        <div className="sim-zone-empty">なし</div>
      )}
    </div>
  )
}

function StageArea() {
  const cards = useGameStore((s) => s.cards)
  const { setNodeRef, isOver } = useDroppable({ id: 'stage' })
  const stageCard = Object.values(cards).find((c) => c.zone === 'stage')

  return (
    <div ref={setNodeRef} className={`sim-stage-area ${isOver ? 'sim-zone--over' : ''}`}>
      <div className="sim-zone-label">ステージ</div>
      {stageCard ? (
        <GameCardDisplay gameCard={stageCard} size="md" />
      ) : (
        <div className="sim-zone-empty">なし</div>
      )}
    </div>
  )
}

function PlayerField() {
  const cards = useGameStore((s) => s.cards)
  const { setNodeRef, isOver } = useDroppable({ id: 'field' })

  const fieldCards = Object.values(cards)
    .filter((c) => c.zone === 'field')
    .sort((a, b) => (a.fieldIndex ?? 0) - (b.fieldIndex ?? 0))

  return (
    <div ref={setNodeRef} className={`sim-player-field ${isOver ? 'sim-zone--over' : ''}`}>
      <div className="sim-zone-label">キャラエリア ({fieldCards.length}/10)</div>
      <div className="sim-field-cards">
        <AnimatePresence>
          {fieldCards.map((card) => (
            <GameCardDisplay key={card.instanceId} gameCard={card} size="md" showPower={true} />
          ))}
        </AnimatePresence>
        {fieldCards.length === 0 && (
          <div className="sim-field-empty">カードをここにドラッグ</div>
        )}
      </div>
    </div>
  )
}

function OppField() {
  const cards = useGameStore((s) => s.cards)
  const { setNodeRef, isOver } = useDroppable({ id: 'opp_field' })
  const oppCards = Object.values(cards).filter((c) => c.zone === 'opp_field')

  return (
    <div ref={setNodeRef} className={`sim-opp-field ${isOver ? 'sim-zone--over' : ''}`}>
      <div className="sim-zone-label">相手フィールド (練習用)</div>
      <div className="sim-field-cards">
        <AnimatePresence>
          {oppCards.map((card) => (
            <GameCardDisplay key={card.instanceId} gameCard={card} size="sm" />
          ))}
        </AnimatePresence>
        {oppCards.length === 0 && <div className="sim-field-empty">相手フィールド</div>}
      </div>
    </div>
  )
}

export function CenterField() {
  return (
    <main className="sim-center-panel">
      <OppField />
      <PlayerField />
      <div className="sim-center-bottom">
        <LeaderArea />
        <StageArea />
      </div>
      <DonZone />
    </main>
  )
}
