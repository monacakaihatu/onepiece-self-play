import { AnimatePresence } from 'framer-motion'
import { useGameStore } from '../../store/gameStore'
import { GameCardDisplay } from './GameCardDisplay'

export function HandFan() {
  const cards = useGameStore((s) => s.cards)
  const handCards = Object.values(cards).filter((c) => c.zone === 'hand')

  const n = handCards.length
  if (n === 0) {
    return (
      <div className="sim-hand-fan sim-hand-fan--empty">
        <span>手札なし</span>
      </div>
    )
  }

  const spreadAngle = Math.min(8 * n, 60)
  const stepAngle = n > 1 ? spreadAngle / (n - 1) : 0
  const arcY = 3.5

  return (
    <div className="sim-hand-fan">
      <AnimatePresence>
        {handCards.map((card, i) => {
          const rotation = -spreadAngle / 2 + i * stepAngle
          const translateY = Math.abs(rotation) * arcY

          return (
            <div
              key={card.instanceId}
              className="sim-hand-card-wrapper"
              style={{
                transform: `rotate(${rotation}deg) translateY(${translateY}px)`,
                transformOrigin: 'center 250%',
                zIndex: i,
                position: 'absolute',
                bottom: 0,
                left: '50%',
                marginLeft: -45,
              }}
            >
              <GameCardDisplay
                gameCard={card}
                size="md"
                className="sim-hand-card"
              />
            </div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
