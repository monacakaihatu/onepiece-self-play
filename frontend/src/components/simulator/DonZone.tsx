import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useGameStore } from '../../context/GameStoreContext'
import type { DonToken } from '../../types/game'

function DonCard({ token, onRest }: { token: DonToken; onRest: () => void }) {
  const isAttached = !!token.attachedTo
  const isRested = token.rested && !isAttached

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `don-${token.id}`,
    data: { type: 'don', donId: token.id },
    disabled: isAttached,
  })

  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 500 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`sim-don-card${isAttached ? ' sim-don-card--attached' : ''}${isRested ? ' sim-don-card--rested' : ''}${isDragging ? ' sim-don-card--dragging' : ''}`}
      title={isAttached ? '付与中' : 'ドラッグで付与 / クリックでレスト'}
      onClick={() => !isAttached && onRest()}
      style={dragStyle}
    >
      <img src="/Don.jpeg" alt="DON!!" draggable={false} />
    </div>
  )
}

export function DonZone() {
  const donTokens = useGameStore((s) => s.donTokens)
  const donMax = useGameStore((s) => s.donMax)
  const gainDon = useGameStore((s) => s.gainDon)
  const removeDon = useGameStore((s) => s.removeDon)
  const toggleRestDon = useGameStore((s) => s.toggleRestDon)
  const { setNodeRef, isOver } = useDroppable({ id: 'don_return' })

  const gainedTokens = donTokens.filter((d) => d.used || d.attachedTo)
  const gainedCount = gainedTokens.length
  const availableCount = donTokens.filter((d) => d.used && !d.attachedTo && !d.rested).length
  const canGain = donTokens.some((d) => !d.used && !d.attachedTo)
  const canRemove = donTokens.some((d) => d.used && !d.attachedTo)

  return (
    <div
      ref={setNodeRef}
      className={`sim-don-zone ${isOver ? 'sim-don-zone--over' : ''}`}
    >
      <div className="sim-don-zone__header">
        <span className="sim-don-zone__title">ドン!!</span>
        <span className="sim-don-zone__count">
          {availableCount} / {gainedCount}
          {donMax < 10 && <span className="sim-don-count__max"> MAX {donMax}</span>}
        </span>
        <div className="sim-don-zone__btns">
          <button
            className="btn btn--sm sim-don-zone__btn"
            onClick={() => removeDon()}
            disabled={!canRemove}
            title="ドン!!を1枚戻す"
          >
            −
          </button>
          <button
            className="btn btn--sm sim-don-zone__btn"
            onClick={() => gainDon(1)}
            disabled={!canGain}
            title={canGain ? 'ドン!!を1枚追加' : `上限(${donMax}枚)に達しています`}
          >
            ＋
          </button>
        </div>
      </div>

      <div className="sim-don-cards">
        {gainedTokens.map((token) => (
          <DonCard
            key={token.id}
            token={token}
            onRest={() => toggleRestDon(token.id)}
          />
        ))}
        {gainedCount === 0 && (
          <div className="sim-don-empty">ドン!!なし</div>
        )}
      </div>
    </div>
  )
}
