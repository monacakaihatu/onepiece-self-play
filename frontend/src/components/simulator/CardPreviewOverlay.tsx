import { useGameStore } from '../../context/GameStoreContext'

export function CardPreviewOverlay() {
  const previewCard = useGameStore((s) => s.previewCard)
  if (!previewCard) return null

  const { card, powerMod } = previewCard
  const displayPower = card.power !== null ? card.power + powerMod : null

  return (
    <div className="sim-preview-overlay">
      <div className="sim-preview-inner">
        <img
          src={`/image/${card.id}`}
          alt={card.name ?? card.name_en ?? card.id}
          className="sim-preview-img"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = '/placeholder.png'
          }}
        />
        <div className="sim-preview-info">
          <div className="sim-preview-name">{card.name ?? card.name_en}</div>
          {card.name && card.name_en && (
            <div className="sim-preview-name-en">{card.name_en}</div>
          )}
          <div className="sim-preview-stats">
            {card.cost !== null && (
              <span className="sim-preview-stat">コスト: {card.cost}</span>
            )}
            {displayPower !== null && (
              <span
                className={`sim-preview-stat ${powerMod !== 0 ? 'sim-preview-stat--modified' : ''}`}
              >
                パワー: {displayPower.toLocaleString()}
                {powerMod !== 0 ? ` (${powerMod > 0 ? '+' : ''}${powerMod})` : ''}
              </span>
            )}
            {card.counter !== null && (
              <span className="sim-preview-stat">カウンター: +{card.counter}</span>
            )}
          </div>
          {card.sub_types && (
            <div className="sim-preview-subtypes">{card.sub_types}</div>
          )}
          {(card.effect_text ?? card.effect_text_en) && (
            <div className="sim-preview-effect">{card.effect_text ?? card.effect_text_en}</div>
          )}
        </div>
      </div>
    </div>
  )
}
