import type { Card } from '../types'

interface Props {
  card: Card
  onClick?: (card: Card) => void
  badge?: number
  disabled?: boolean
}

export function CardTile({ card, onClick, badge, disabled }: Props) {
  return (
    <div
      className={`card-tile${disabled ? ' card-tile--disabled' : ''}`}
      onClick={() => !disabled && onClick?.(card)}
      title={card.name_ja ?? card.name}
    >
      <img
        src={`/image/${card.id}`}
        alt={card.name_ja ?? card.name}
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = '/placeholder.png'
        }}
      />
      {badge !== undefined && badge > 0 && (
        <span className="card-tile__badge">{badge}</span>
      )}
    </div>
  )
}
