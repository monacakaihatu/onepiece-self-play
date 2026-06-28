import { useDroppable } from '@dnd-kit/core'
import { useGameStore } from '../../context/GameStoreContext'

export function DonZone() {
  const donTokens = useGameStore((s) => s.donTokens)
  const donMax = useGameStore((s) => s.donMax)
  const gainDon = useGameStore((s) => s.gainDon)
  const { setNodeRef, isOver } = useDroppable({ id: 'don_return' })

  // "used" tokens are in the pool (gained). Attached tokens are also "used".
  const gainedCount = donTokens.filter((d) => d.used || d.attachedTo).length
  // "not used" tokens haven't been added to the pool yet
  const ungainedCount = donTokens.filter((d) => !d.used && !d.attachedTo).length
  // Available in pool but not attached
  const availableCount = donTokens.filter((d) => d.used && !d.attachedTo).length
  const canGain = ungainedCount > 0

  return (
    <div className="sim-don-zone">
      <div className="sim-don-zone__header">
        <span className="sim-don-zone__title">ドン!!</span>
        <button
          className="btn btn--sm sim-don-zone__btn"
          onClick={() => gainDon(1)}
          disabled={!canGain}
          title={canGain ? 'ドン!!を1枚追加' : `上限(${donMax}枚)に達しています`}
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
          const isInPool = token.used
          const isUngained = !token.used && !token.attachedTo

          return (
            <div
              key={token.id}
              className={`sim-don-token ${
                isUngained
                  ? 'sim-don-token--available'
                  : isAttached
                    ? 'sim-don-token--attached'
                    : 'sim-don-token--used'
              }`}
              title={isAttached ? '付与中' : isInPool ? '使用可能' : '未獲得'}
            />
          )
        })}
      </div>

      <div className="sim-don-zone__counts">
        <span className="sim-don-count sim-don-count--available">{availableCount}</span>
        <span className="sim-don-count__sep">/</span>
        <span className="sim-don-count sim-don-count--total">{gainedCount}</span>
        {donMax < 10 && (
          <span className="sim-don-count__max"> (MAX {donMax})</span>
        )}
      </div>
    </div>
  )
}
