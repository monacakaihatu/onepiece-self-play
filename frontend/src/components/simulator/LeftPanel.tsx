import { useDroppable } from '@dnd-kit/core'
import { AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../context/GameStoreContext'
import { GameCardDisplay } from './GameCardDisplay'

function DeckZone() {
  const cards = useGameStore((s) => s.cards)
  const deckOrder = useGameStore((s) => s.deckOrder)
  const drawCard = useGameStore((s) => s.drawCard)
  const shuffleDeck = useGameStore((s) => s.shuffleDeck)
  const openDeckTopModal = useGameStore((s) => s.openDeckTopModal)
  const { setNodeRef, isOver } = useDroppable({ id: 'deck' })

  const deckCards = Object.values(cards).filter((c) => c.zone === 'deck')
  const count = deckCards.length
  const topCardId = deckOrder[0]
  const topCard = topCardId ? cards[topCardId] : undefined

  return (
    <div className="sim-left-zone">
      <div className="sim-zone-label">山札</div>
      <div
        ref={setNodeRef}
        className={`sim-deck-area ${isOver ? 'sim-zone--over' : ''}`}
        onClick={() => drawCard(1)}
        title="クリックでドロー"
      >
        {topCard ? (
          <GameCardDisplay gameCard={topCard} size="md" showPower={false} disableDrag={true} />
        ) : (
          <div className="sim-deck-empty">空</div>
        )}
        <div className="sim-deck-count">{count}</div>
      </div>
      <button className="btn btn--sm sim-left-btn" onClick={() => shuffleDeck()}>
        シャッフル
      </button>
      <button className="btn btn--sm sim-left-btn" onClick={() => drawCard(1)}>
        ドロー [D]
      </button>

      <div className="sim-deck-peek-buttons">
        <div className="sim-deck-peek-label">確認</div>
        <button
          className="btn btn--sm sim-left-btn"
          onClick={() => openDeckTopModal(2)}
          disabled={count < 2}
          title="デッキトップ2枚を確認"
        >
          上2枚
        </button>
        <button
          className="btn btn--sm sim-left-btn"
          onClick={() => openDeckTopModal(3)}
          disabled={count < 3}
          title="デッキトップ3枚を確認"
        >
          上3枚
        </button>
        <button
          className="btn btn--sm sim-left-btn"
          onClick={() => openDeckTopModal(5)}
          disabled={count < 5}
          title="デッキトップ5枚を確認"
        >
          上5枚
        </button>
      </div>
    </div>
  )
}

function GraveyardZone() {
  const cards = useGameStore((s) => s.cards)
  const { setNodeRef, isOver } = useDroppable({ id: 'graveyard' })

  const gravCards = Object.values(cards).filter((c) => c.zone === 'graveyard')
  const topCard = gravCards[gravCards.length - 1]

  return (
    <div className="sim-left-zone">
      <div className="sim-zone-label">墓地 ({gravCards.length})</div>
      <div ref={setNodeRef} className={`sim-graveyard-area ${isOver ? 'sim-zone--over' : ''}`}>
        {topCard && <GameCardDisplay gameCard={topCard} size="md" disableDrag={false} />}
        {!topCard && <div className="sim-zone-empty">なし</div>}
      </div>
      {gravCards.length > 1 && (
        <div className="sim-graveyard-scroll">
          <AnimatePresence>
            {gravCards
              .slice(-8)
              .reverse()
              .slice(1)
              .map((card) => (
                <GameCardDisplay key={card.instanceId} gameCard={card} size="sm" />
              ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}


function LifeZone() {
  const lifeCards = useGameStore((s) => s.lifeCards)
  const cards = useGameStore((s) => s.cards)
  const { setNodeRef, isOver } = useDroppable({ id: 'life' })
  const count = lifeCards.length

  return (
    <div className="sim-left-zone">
      <div className="sim-zone-label">ライフ</div>
      <div ref={setNodeRef} className={`sim-life-area ${isOver ? 'sim-zone--over' : ''}`}>
        <div className="sim-life-count">{count}</div>
        <div className="sim-life-cards">
          {lifeCards.map((id) => {
            const c = cards[id]
            return c ? <GameCardDisplay key={id} gameCard={c} size="sm" showPower={false} /> : null
          })}
        </div>
      </div>
    </div>
  )
}

export function LeftPanel() {
  return (
    <aside className="sim-left-panel">
      <DeckZone />
      <LifeZone />
      <GraveyardZone />
    </aside>
  )
}
