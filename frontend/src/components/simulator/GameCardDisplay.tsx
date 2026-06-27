import { useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { useGameStore } from '../../context/GameStoreContext'
import type { GameCard } from '../../types/game'

interface Props {
  gameCard: GameCard
  size?: 'sm' | 'md' | 'lg'
  showPower?: boolean
  style?: React.CSSProperties
  className?: string
  disableDrag?: boolean
}

const SIZE_MAP = {
  sm: { width: 60, height: 84 },
  md: { width: 90, height: 126 },
  lg: { width: 110, height: 154 },
}

export function GameCardDisplay({
  gameCard,
  size = 'md',
  showPower = true,
  style,
  className = '',
  disableDrag = false,
}: Props) {
  const { instanceId, card, rested, faceUp, powerMod, donAttached } = gameCard
  const setPreview = useGameStore((s) => s.setPreview)
  const openContextMenu = useGameStore((s) => s.openContextMenu)
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: instanceId,
    disabled: disableDrag,
    data: { zone: gameCard.zone },
  })

  const { width, height } = SIZE_MAP[size]
  const displayPower = card.power !== null ? card.power + powerMod : null

  const getColorClass = () => {
    if (!card.color) return ''
    const c = card.color.toLowerCase()
    if (c.includes('red')) return 'sim-card--red'
    if (c.includes('blue')) return 'sim-card--blue'
    if (c.includes('green')) return 'sim-card--green'
    if (c.includes('yellow')) return 'sim-card--yellow'
    if (c.includes('purple')) return 'sim-card--purple'
    if (c.includes('black')) return 'sim-card--black'
    return ''
  }

  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 1000 }
    : undefined

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    openContextMenu(instanceId, e.clientX, e.clientY)
  }

  const handleMouseEnter = () => {
    if (faceUp) setPreview(gameCard)
  }

  const handleMouseLeave = () => {
    setPreview(null)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    const x = touch.clientX
    const y = touch.clientY
    longPressRef.current = setTimeout(() => {
      openContextMenu(instanceId, x, y)
    }, 600)
  }

  const handleTouchEnd = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current)
      longPressRef.current = null
    }
  }

  return (
    <motion.div
      layout
      layoutId={instanceId}
      ref={setNodeRef}
      className={`sim-card ${getColorClass()} ${rested ? 'sim-card--rested' : ''} ${isDragging ? 'sim-card--dragging' : ''} ${className}`}
      style={{ width, height, ...dragStyle, ...style }}
      {...attributes}
      {...listeners}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {faceUp ? (
        <img
          src={`/image/${card.id}`}
          alt={card.name ?? card.name_en ?? card.id}
          className="sim-card__img"
          draggable={false}
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = '/placeholder.png'
          }}
        />
      ) : (
        <div className="sim-card__back">
          <div className="sim-card__back-pattern" />
        </div>
      )}

      {showPower && faceUp && displayPower !== null && (
        <div
          className={`sim-card__power ${powerMod > 0 ? 'sim-card__power--up' : powerMod < 0 ? 'sim-card__power--down' : ''}`}
        >
          {displayPower >= 1000 ? `${displayPower / 1000}k` : displayPower}
        </div>
      )}

      {donAttached > 0 && <div className="sim-card__don-count">+{donAttached}</div>}

      {rested && <div className="sim-card__rest-overlay" />}
    </motion.div>
  )
}
