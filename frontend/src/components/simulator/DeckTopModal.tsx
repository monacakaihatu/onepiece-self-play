import { useState, useEffect } from 'react'
import { useGameStore } from '../../context/GameStoreContext'
import type { GameCard } from '../../types/game'

type CardDest = 'hand' | 'graveyard' | null // null = remaining (goes back to deck bottom or trash)

export function DeckTopModal() {
  const deckTopModal = useGameStore((s) => s.deckTopModal)
  const cards = useGameStore((s) => s.cards)
  const closeDeckTopModal = useGameStore((s) => s.closeDeckTopModal)
  const commitDeckTopModal = useGameStore((s) => s.commitDeckTopModal)

  const [assignments, setAssignments] = useState<Record<string, CardDest>>({})
  const [remainingOrder, setRemainingOrder] = useState<string[]>([])
  const [remainingDest, setRemainingDest] = useState<'deck_bottom' | 'graveyard'>('deck_bottom')

  // Reset local state whenever the modal object itself changes (new open, or close+reopen with same cards)
  useEffect(() => {
    if (deckTopModal) {
      setAssignments({})
      setRemainingOrder(deckTopModal.peekedIds)
      setRemainingDest('deck_bottom')
    }
  }, [deckTopModal])

  if (!deckTopModal) return null

  const peekedCards: GameCard[] = deckTopModal.peekedIds
    .map((id) => cards[id])
    .filter(Boolean) as GameCard[]

  const unassignedIds = remainingOrder.filter((id) => !assignments[id])

  const toggle = (id: string, dest: CardDest) => {
    setAssignments((prev) => {
      if (prev[id] === dest) {
        const { [id]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [id]: dest }
    })
  }

  const moveUp = (id: string) => {
    const idx = unassignedIds.indexOf(id)
    if (idx <= 0) return
    const posA = remainingOrder.indexOf(unassignedIds[idx - 1])
    const posB = remainingOrder.indexOf(id)
    if (posA === -1 || posB === -1) return
    const newOrder = [...remainingOrder]
    ;[newOrder[posA], newOrder[posB]] = [newOrder[posB], newOrder[posA]]
    setRemainingOrder(newOrder)
  }

  const moveDown = (id: string) => {
    const idx = unassignedIds.indexOf(id)
    if (idx === -1 || idx >= unassignedIds.length - 1) return
    const posA = remainingOrder.indexOf(id)
    const posB = remainingOrder.indexOf(unassignedIds[idx + 1])
    if (posA === -1 || posB === -1) return
    const newOrder = [...remainingOrder]
    ;[newOrder[posA], newOrder[posB]] = [newOrder[posB], newOrder[posA]]
    setRemainingOrder(newOrder)
  }

  const handleConfirm = () => {
    const handIds = Object.entries(assignments)
      .filter(([, d]) => d === 'hand')
      .map(([id]) => id)
    const gravIds = Object.entries(assignments)
      .filter(([, d]) => d === 'graveyard')
      .map(([id]) => id)
    const deckBottomIds = remainingDest === 'deck_bottom' ? unassignedIds : []
    const remainingGravIds = remainingDest === 'graveyard' ? unassignedIds : []

    commitDeckTopModal(handIds, [...gravIds, ...remainingGravIds], deckBottomIds)
  }

  return (
    <div className="modal-overlay" onClick={closeDeckTopModal}>
      <div
        className="modal-content deck-top-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={closeDeckTopModal}>✕</button>

        <div className="deck-top-modal__title">
          デッキトップ {deckTopModal.peekedIds.length} 枚を確認
        </div>

        <div className="deck-top-modal__cards">
          {peekedCards.map((gc, i) => {
            const dest = assignments[gc.instanceId] ?? null
            return (
              <div key={gc.instanceId} className="deck-top-card">
                <div className="deck-top-card__order">{i + 1}</div>
                <div className="deck-top-card__img-wrap">
                  <img
                    src={`/image/${gc.card.id}`}
                    alt={gc.card.name ?? gc.card.id}
                    className="deck-top-card__img"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = '/placeholder.png'
                    }}
                  />
                </div>
                <div className="deck-top-card__name">
                  {gc.card.name ?? gc.card.name_en ?? gc.card.id}
                </div>
                <div className="deck-top-card__actions">
                  <button
                    className={`btn btn--sm ${dest === 'hand' ? 'btn--primary' : ''}`}
                    onClick={() => toggle(gc.instanceId, 'hand')}
                  >
                    手札へ
                  </button>
                  <button
                    className={`btn btn--sm ${dest === 'graveyard' ? 'btn--danger' : ''}`}
                    onClick={() => toggle(gc.instanceId, 'graveyard')}
                  >
                    トラッシュ
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {unassignedIds.length > 0 && (
          <div className="deck-top-modal__remaining">
            <div className="deck-top-modal__remaining-header">
              <span className="deck-top-modal__remaining-title">
                残り {unassignedIds.length} 枚
              </span>
              <div className="deck-top-modal__remaining-dest">
                <button
                  className={`btn btn--sm ${remainingDest === 'deck_bottom' ? 'btn--primary' : ''}`}
                  onClick={() => setRemainingDest('deck_bottom')}
                >
                  デッキ下へ
                </button>
                <button
                  className={`btn btn--sm ${remainingDest === 'graveyard' ? 'btn--danger' : ''}`}
                  onClick={() => setRemainingDest('graveyard')}
                >
                  トラッシュへ
                </button>
              </div>
            </div>

            <div className="deck-top-modal__remaining-list">
              {unassignedIds.map((id, idx) => {
                const gc = cards[id]
                if (!gc) return null
                return (
                  <div key={id} className="deck-top-remaining-item">
                    <div className="deck-top-remaining-item__order">{idx + 1}</div>
                    <img
                      src={`/image/${gc.card.id}`}
                      alt={gc.card.name ?? gc.card.id}
                      className="deck-top-remaining-item__img"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = '/placeholder.png'
                      }}
                    />
                    <span className="deck-top-remaining-item__name">
                      {gc.card.name ?? gc.card.name_en ?? gc.card.id}
                    </span>
                    <div className="deck-top-remaining-item__move">
                      <button
                        className="btn btn--sm"
                        onClick={() => moveUp(id)}
                        disabled={idx === 0}
                        title="上へ"
                      >
                        ↑
                      </button>
                      <button
                        className="btn btn--sm"
                        onClick={() => moveDown(id)}
                        disabled={idx === unassignedIds.length - 1}
                        title="下へ"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="deck-top-modal__footer">
          <button className="btn" onClick={closeDeckTopModal}>
            キャンセル
          </button>
          <button className="btn btn--primary" onClick={handleConfirm}>
            確定
          </button>
        </div>
      </div>
    </div>
  )
}
