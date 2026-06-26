import type { Card } from '../types'

interface Props {
  card: Card
  onClose: () => void
  onAdd?: (card: Card) => void
}

export function CardDetail({ card, onClose, onAdd }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card-add-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        <img
          src={`/image/${card.id}`}
          alt={card.name ?? card.name_en ?? card.id}
          className="card-add-modal__img"
        />

        <div className="card-add-modal__body">
          <h2>{card.name ?? card.name_en}</h2>
          {card.name_en && <p className="card-add-modal__name-en">{card.name_en}</p>}
          <table>
            <tbody>
              <tr>
                <th>ID</th>
                <td>{card.id}</td>
              </tr>
              {card.category && (
                <tr>
                  <th>種別</th>
                  <td>{card.category}</td>
                </tr>
              )}
              {card.color && (
                <tr>
                  <th>色</th>
                  <td>{card.color}</td>
                </tr>
              )}
              {card.cost != null && (
                <tr>
                  <th>コスト</th>
                  <td>{card.cost}</td>
                </tr>
              )}
              {card.power != null && (
                <tr>
                  <th>パワー</th>
                  <td>{card.power.toLocaleString()}</td>
                </tr>
              )}
              {card.counter != null && (
                <tr>
                  <th>カウンター</th>
                  <td>{card.counter.toLocaleString()}</td>
                </tr>
              )}
              {card.life && (
                <tr>
                  <th>ライフ</th>
                  <td>{card.life}</td>
                </tr>
              )}
              {card.attribute && (
                <tr>
                  <th>属性</th>
                  <td>{card.attribute}</td>
                </tr>
              )}
              {card.sub_types && (
                <tr>
                  <th>タイプ</th>
                  <td>{card.sub_types}</td>
                </tr>
              )}
              {card.rarity && (
                <tr>
                  <th>レアリティ</th>
                  <td>{card.rarity}</td>
                </tr>
              )}
              {card.set_code && (
                <tr>
                  <th>セット</th>
                  <td>{card.set_code}</td>
                </tr>
              )}
            </tbody>
          </table>
          {(card.effect_text || card.effect_text_en) && (
            <div className="card-detail__text">
              <h3>テキスト</h3>
              <p>{card.effect_text ?? card.effect_text_en}</p>
            </div>
          )}
          {onAdd && (
            <button className="btn btn--primary" onClick={() => onAdd(card)}>
              デッキに追加
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
