import { useGameStore } from '../../context/GameStoreContext'

export function PhaseBar() {
  const turnNumber = useGameStore((s) => s.turnNumber)
  const historyLen = useGameStore((s) => s._history.length)
  const futureLen = useGameStore((s) => s._future.length)
  const endTurn = useGameStore((s) => s.endTurn)
  const undo = useGameStore((s) => s.undo)
  const redo = useGameStore((s) => s.redo)

  return (
    <div className="sim-phase-bar">
      <div className="sim-phase-bar__turn">T{turnNumber}</div>

      <div className="sim-phase-bar__free-label">自由操作モード</div>

      <div className="sim-phase-bar__actions">
        <button
          className="btn btn--sm sim-phase-bar__undo"
          onClick={undo}
          disabled={historyLen === 0}
          title="元に戻す (Ctrl+Z)"
        >
          ↩
        </button>
        <button
          className="btn btn--sm sim-phase-bar__redo"
          onClick={redo}
          disabled={futureLen === 0}
          title="やり直し (Ctrl+Y)"
        >
          ↪
        </button>
        <button
          className="btn btn--primary sim-phase-bar__next"
          onClick={endTurn}
          title="ターン終了: 全カードリフレッシュ、DON!!デタッチ、ターン+1 [Space]"
        >
          ターン終了 [Space]
        </button>
      </div>
    </div>
  )
}
