import type { Card, DeckCardItem } from '../types'

interface Props {
  deckName: string
  leader: Card | null
  cards: DeckCardItem[]
  errors: string[]
  onQuantityChange: (cardId: string, delta: number) => void
  onSave: () => void
  onNameChange: (name: string) => void
  saving: boolean
}

export function DeckPanel({
  deckName,
  leader,
  cards,
  errors,
  onQuantityChange,
  onSave,
  onNameChange,
  saving,
}: Props) {
  const total = cards.reduce((s, c) => s + c.quantity, 0)

  return (
    <aside className="deck-panel">
      <div className="deck-panel__header">
        <input
          className="deck-panel__name"
          value={deckName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="デッキ名"
        />
        <div className="deck-panel__counts">
          <span className={total === 50 ? 'count--ok' : 'count--ng'}>{total} / 50</span>
        </div>
      </div>

      {leader && (
        <div className="deck-panel__leader">
          <img src={`/image/${leader.id}`} alt={leader.name_ja ?? leader.name} />
          <span>{leader.name_ja ?? leader.name}</span>
        </div>
      )}

      {errors.length > 0 && (
        <ul className="deck-panel__errors">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      <div className="deck-panel__cards">
        {cards.length === 0 && (
          <p className="deck-panel__empty">カードを選択してデッキに追加してください</p>
        )}
        {cards.map(({ card, quantity }) => (
          <div key={card.id} className="deck-card-row">
            <img src={`/image/${card.id}`} alt={card.name_ja ?? card.name} className="deck-card-row__img" />
            <span className="deck-card-row__name">{card.name_ja ?? card.name}</span>
            <div className="deck-card-row__controls">
              <button onClick={() => onQuantityChange(card.id, -1)}>－</button>
              <span>{quantity}</span>
              <button onClick={() => onQuantityChange(card.id, +1)}>＋</button>
            </div>
          </div>
        ))}
      </div>

      <div className="deck-panel__footer">
        <button
          className="btn btn--primary"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? '保存中...' : 'デッキを保存'}
        </button>
      </div>
    </aside>
  )
}
