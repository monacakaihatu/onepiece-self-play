import { useDroppable } from '@dnd-kit/core'
import { useGameStore } from '../../context/GameStoreContext'

export function DonZone() {
  const donTokens = useGameStore((s) => s.donTokens)
  const gainDon = useGameStore((s) => s.gainDon)
  const { setNodeRef, isOver } = useDroppable({ id: 'don_return' })

  const gainedCount = donTokens.filter((d) => d.used || d.attachedTo).length
  const freeCount = donTokens.filter((d) => !d.used && !d.attachedTo).length

  return (
    <div className="sim-don-zone">
      <div className="sim-don-zone__header">
        <span className="sim-don-zone__title">ドン!!</span>
        <button
          className="btn btn--sm sim-don-zone__btn"
          onClick={() => gainDon(1)}
          title="ドン!!を1枚追加"
        >
          +1
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`sim-don-pool ${isOver ? 'sim-don-pool--over' : ''}`}
      >
        {donTokens.map((token) => {
          const isAttached = !!token.attachedTo
          const isUsed = token.used
          const inactive = !isUsed && !isAttached

          return (
            <div
              key={token.id}
              className={`sim-don-token ${inactive ? 'sim-don-token--available' : 'sim-don-token--used'} ${isAttached ? 'sim-don-token--attached' : ''}`}
              title={isAttached ? '付与中' : isUsed ? '使用可能' : '未獲得'}
            />
          )
        })}
      </div>

      <div className="sim-don-zone__counts">
        <span className="sim-don-count sim-don-count--available">{freeCount}</span>
        <span className="sim-don-count__sep">/</span>
        <span className="sim-don-count sim-don-count--total">{gainedCount + freeCount}</span>
      </div>
    </div>
  )
}
