import type { Card } from '../types'

// Inline placeholder — no network request when image is missing
const PLACEHOLDER =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='140' viewBox='0 0 100 140'%3E%3Crect width='100' height='140' rx='5' fill='%230d0d1f'/%3E%3Crect x='1' y='1' width='98' height='138' rx='4' fill='none' stroke='%23333' stroke-width='1'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='28' fill='%23333' text-anchor='middle' dominant-baseline='middle'%3E%3F%3C/text%3E%3C/svg%3E"

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
          ;(e.currentTarget as HTMLImageElement).src = PLACEHOLDER
        }}
      />
      {badge !== undefined && badge > 0 && <span className="card-tile__badge">{badge}</span>}
    </div>
  )
}
