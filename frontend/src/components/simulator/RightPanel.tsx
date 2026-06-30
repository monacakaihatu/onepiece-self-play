import { useDroppable } from '@dnd-kit/core'
import { AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../context/GameStoreContext'
import { GameCardDisplay } from './GameCardDisplay'

function PanelHeader() {
  const deckName = useGameStore((s) => s.deckName)
  const turnNumber = useGameStore((s) => s.turnNumber)
  const cards = useGameStore((s) => s.cards)
  const lifeCards = useGameStore((s) => s.lifeCards)
  const deckOrder = useGameStore((s) => s.deckOrder)

  const handCount = Object.values(cards).filter((c) => c.zone === 'hand').length
  const deckCount = deckOrder.length
  const lifeCount = lifeCards.length

  return (
    <div className="sim-rp-header">
      <div className="sim-rp-header__top">
        <span className="sim-rp-header__name" title={deckName}>{deckName}</span>
        <span className="sim-rp-header__turn">T{turnNumber}</span>
      </div>
      <div className="sim-rp-header__stats">
        <div className="sim-rp-stat">
          <span className="sim-rp-stat__label">手札</span>
          <span className="sim-rp-stat__value">{handCount}</span>
        </div>
        <div className="sim-rp-stat">
          <span className="sim-rp-stat__label">山札</span>
          <span className="sim-rp-stat__value">{deckCount}</span>
        </div>
        <div className="sim-rp-stat">
          <span className="sim-rp-stat__label">ライフ</span>
          <span className="sim-rp-stat__value">{lifeCount}</span>
        </div>
      </div>
    </div>
  )
}

function HandSection() {
  const cards = useGameStore((s) => s.cards)
  const { setNodeRef, isOver } = useDroppable({ id: 'hand' })
  const handCards = Object.values(cards).filter((c) => c.zone === 'hand')

  return (
    <div className="sim-rp-hand">
      <div className="sim-rp-section-label">手札</div>
      <div ref={setNodeRef} className={`sim-rp-hand__cards ${isOver ? 'sim-zone--over' : ''}`}>
        <AnimatePresence>
          {handCards.map((card) => (
            <GameCardDisplay
              key={card.instanceId}
              gameCard={card}
              size="sm"
              showPower={false}
              className="sim-hand-list-card"
            />
          ))}
        </AnimatePresence>
        {handCards.length === 0 && <div className="sim-zone-empty">手札なし</div>}
      </div>
    </div>
  )
}

function ActionSection() {
  const drawCard = useGameStore((s) => s.drawCard)
  const shuffleDeck = useGameStore((s) => s.shuffleDeck)
  const refreshAll = useGameStore((s) => s.refreshAll)
  const resetGame = useGameStore((s) => s.resetGame)

  return (
    <div className="sim-rp-actions">
      <button className="btn btn--primary sim-rp-btn" onClick={() => drawCard(1)}>
        ドロー <kbd>D</kbd>
      </button>
      <button className="btn btn--sm sim-rp-btn" onClick={() => refreshAll()}>
        全リフレッシュ <kbd>R</kbd>
      </button>
      <button className="btn btn--sm sim-rp-btn" onClick={() => shuffleDeck()}>
        シャッフル
      </button>
      <button
        className="btn btn--sm btn--danger sim-rp-btn"
        onClick={() => { if (confirm('ゲームをリセットしますか？')) resetGame() }}
      >
        リセット
      </button>

      <div className="sim-rp-shortcuts">
        <div className="sim-rp-shortcut"><kbd>Space</kbd> ターン終了</div>
        <div className="sim-rp-shortcut"><kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Y</kbd> Undo/Redo</div>
        <div className="sim-rp-shortcut"><kbd>Esc</kbd> メニュー閉じる</div>
        <div className="sim-rp-shortcut">右クリック カードメニュー</div>
      </div>
    </div>
  )
}

export function RightPanel() {
  return (
    <aside className="sim-right-panel">
      <PanelHeader />
      <HandSection />
      <ActionSection />
    </aside>
  )
}
