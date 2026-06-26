import type { Card } from '../types'

interface Props {
  card: Card
  onClick?: (card: Card) => void
  onDoubleClick?: (card: Card) => void
  onRightClick?: (e: React.MouseEvent, card: Card) => void
  badge?: number
  disabled?: boolean
}

export function CardTile({ card, onClick, onDoubleClick, onRightClick, badge, disabled }: Props) {
  return (
    <div
      className={`card-tile${disabled ? ' card-tile--disabled' : ''}`}
      onClick={() => !disabled && onClick?.(card)}
      onDoubleClick={(e) => {
        e.preventDefault()
        !disabled && onDoubleClick?.(card)
      }}
      onContextMenu={(e) => onRightClick?.(e, card)}
      title={card.name ?? card.name_en ?? ''}
    >
      <img
        src={`/image/${card.id}`}
        alt={card.name ?? card.name_en ?? ''}
        loading="lazy"
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).src = '/placeholder.png'
        }}
      />
      {badge !== undefined && badge > 0 && <span className="card-tile__badge">{badge}</span>}
    </div>
  )
}
