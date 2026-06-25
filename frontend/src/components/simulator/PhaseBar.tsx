import { useGameStore } from '../../store/gameStore'
import { PHASE_LABELS, type GamePhase } from '../../types/game'

const PHASES: GamePhase[] = ['refresh', 'draw', 'don', 'main', 'battle', 'end']

export function PhaseBar() {
  const phase = useGameStore((s) => s.phase)
  const turnNumber = useGameStore((s) => s.turnNumber)
  const { nextPhase, undo, redo, _history, _future } = useGameStore.getState()

  const getNextLabel = () => {
    if (phase === 'end') return '次のターンへ'
    const idx = PHASES.indexOf(phase)
    return `次: ${PHASE_LABELS[PHASES[idx + 1]]}`
  }

  return (
    <div className="sim-phase-bar">
      <div className="sim-phase-bar__turn">T{turnNumber}</div>

      <div className="sim-phase-bar__phases">
        {PHASES.map((p) => (
          <div
            key={p}
            className={`sim-phase-chip ${p === phase ? 'sim-phase-chip--active' : ''}`}
            onClick={() => useGameStore.getState().setPhase(p)}
            title={`${PHASE_LABELS[p]}フェーズへ移動`}
          >
            {PHASE_LABELS[p]}
          </div>
        ))}
      </div>

      <div className="sim-phase-bar__actions">
        <button
          className="btn btn--sm sim-phase-bar__undo"
          onClick={() => undo()}
          disabled={_history.length === 0}
          title="元に戻す (Ctrl+Z)"
        >
          ↩
        </button>
        <button
          className="btn btn--sm sim-phase-bar__redo"
          onClick={() => redo()}
          disabled={_future.length === 0}
          title="やり直し (Ctrl+Y)"
        >
          ↪
        </button>
        <button className="btn btn--primary sim-phase-bar__next" onClick={nextPhase}>
          {getNextLabel()} [Space]
        </button>
      </div>
    </div>
  )
}
