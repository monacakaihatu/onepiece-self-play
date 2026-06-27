import { useDroppable } from '@dnd-kit/core'
import { AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../context/GameStoreContext'
import { GameCardDisplay } from './GameCardDisplay'
import { DonZone } from './DonZone'

function HandList() {
  const cards = useGameStore((s) => s.cards)
  const handCards = Object.values(cards).filter((c) => c.zone === 'hand')
  const { setNodeRef, isOver } = useDroppable({ id: 'hand' })

  return (
    <div className="sim-right-hand-section">
      <div className="sim-zone-label">手札 ({handCards.length})</div>
      <div ref={setNodeRef} className={`sim-hand-list ${isOver ? 'sim-zone--over' : ''}`}>
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

function Controls() {
  const deckName = useGameStore((s) => s.deckName)
  const drawCard = useGameStore((s) => s.drawCard)
  const shuffleDeck = useGameStore((s) => s.shuffleDeck)
  const refreshAll = useGameStore((s) => s.refreshAll)
  const resetGame = useGameStore((s) => s.resetGame)

  return (
    <div className="sim-controls">
      <div className="sim-controls__name">{deckName}</div>
      <div className="sim-controls__grid">
        <button className="btn btn--sm" onClick={() => drawCard(1)} title="D">
          ドロー
        </button>
        <button className="btn btn--sm" onClick={() => refreshAll()} title="R">
          全リフレッシュ
        </button>
        <button className="btn btn--sm" onClick={() => shuffleDeck()}>
          シャッフル
        </button>
        <button
          className="btn btn--sm btn--danger"
          onClick={() => {
            if (confirm('ゲームをリセットしますか？')) resetGame()
          }}
        >
          リセット
        </button>
      </div>

      <div className="sim-shortcuts">
        <div className="sim-shortcut">
          <kbd>Space</kbd> 次フェーズ
        </div>
        <div className="sim-shortcut">
          <kbd>D</kbd> ドロー
        </div>
        <div className="sim-shortcut">
          <kbd>R</kbd> リフレッシュ
        </div>
        <div className="sim-shortcut">
          <kbd>Ctrl+Z</kbd> 元に戻す
        </div>
        <div className="sim-shortcut">右クリック カードメニュー</div>
      </div>
    </div>
  )
}

export function RightPanel() {
  return (
    <aside className="sim-right-panel">
      <HandList />
      <DonZone />
      <Controls />
    </aside>
  )
}
