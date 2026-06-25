import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Card, CardFilters, DeckCardItem, DeckDetail } from '../types'
import { CardGrid } from '../components/CardGrid'
import { SearchBar } from '../components/SearchBar'
import { FilterPanel } from '../components/FilterPanel'
import { sortDeckCards } from '../utils'

const PAGE_SIZE = 100

const SORT_OPTIONS = [
  { value: 'id', label: 'カード番号↑' },
  { value: 'id_desc', label: 'カード番号↓' },
  { value: 'set', label: '弾順' },
  { value: 'cost_asc', label: 'コスト昇順' },
  { value: 'cost_desc', label: 'コスト降順' },
  { value: 'power_asc', label: 'パワー昇順' },
  { value: 'power_desc', label: 'パワー降順' },
  { value: 'name', label: '名前順' },
]

export function DeckBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const deckId = Number(id)

  const [deck, setDeck] = useState<DeckDetail | null>(null)
  const [deckName, setDeckName] = useState('')
  const [deckCards, setDeckCards] = useState<DeckCardItem[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const [cards, setCards] = useState<Card[]>([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<CardFilters>({ limit: PAGE_SIZE, offset: 0, sort: 'id' })
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [pendingQty, setPendingQty] = useState(0)

  useEffect(() => {
    api.getDeck(deckId).then((d) => {
      setDeck(d)
      setDeckName(d.name)
      setDeckCards(d.cards)
    })
  }, [deckId])

  const fetchCards = useCallback(async (f: CardFilters, append = false) => {
    setLoading(true)
    try {
      const res = await api.getCards({ ...f, exclude_category: ['Leader'] })
      setTotal(res.total)
      setCards((prev) => (append ? [...prev, ...res.items] : res.items))
      setHasMore((f.offset ?? 0) + res.items.length < res.total)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCards({ ...filters, offset: 0 })
  }, [filters.q, filters.color, filters.cost, filters.category, filters.set_code, filters.sort])

  const handleScrollEnd = useCallback(() => {
    if (loading || !hasMore) return
    const nextOffset = (filters.offset ?? 0) + PAGE_SIZE
    const nextFilters = { ...filters, offset: nextOffset }
    setFilters(nextFilters)
    fetchCards(nextFilters, true)
  }, [loading, hasMore, filters, fetchCards])

  const handleFilterChange = useCallback((f: CardFilters) => {
    setFilters((prev) => ({ ...prev, ...f, offset: 0 }))
  }, [])

  const leaderColors = deck?.leader?.color
    ? new Set(deck.leader.color.split(' ').filter(Boolean))
    : null

  const isDisabled = useCallback(
    (card: Card) => {
      if (!leaderColors) return false
      const cardColors = card.color?.split(' ').filter(Boolean) ?? []
      return !cardColors.every((c) => leaderColors.has(c))
    },
    [leaderColors],
  )

  const openCardModal = useCallback(
    (card: Card) => {
      const existing = deckCards.find((c) => c.card.id === card.id)
      setPendingQty(existing?.quantity ?? 0)
      setSelectedCard(card)
    },
    [deckCards],
  )

  const handleApplyQty = useCallback(() => {
    if (!selectedCard) return
    setDeckCards((prev) => {
      const exists = prev.find((c) => c.card.id === selectedCard.id)
      if (pendingQty === 0) return prev.filter((c) => c.card.id !== selectedCard.id)
      if (exists)
        return prev.map((c) => (c.card.id === selectedCard.id ? { ...c, quantity: pendingQty } : c))
      return [...prev, { card: selectedCard, quantity: pendingQty }]
    })
    setSelectedCard(null)
  }, [selectedCard, pendingQty])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setErrors([])
    try {
      const payload = deckCards.map((c) => ({ card_id: c.card.id, quantity: c.quantity }))
      await api.updateDeckCards(deckId, payload, true)
      if (deckName !== deck?.name) {
        await api.updateDeck(deckId, { name: deckName })
      }
      navigate('/')
    } catch (err: unknown) {
      const e = err as { detail?: { errors?: string[] } }
      if (e?.detail?.errors) {
        setErrors(e.detail.errors)
      } else {
        setErrors(['保存中にエラーが発生しました'])
      }
    } finally {
      setSaving(false)
    }
  }, [deckCards, deckId, deckName, deck?.name, navigate])

  const getBadge = useCallback(
    (card: Card) => deckCards.find((c) => c.card.id === card.id)?.quantity,
    [deckCards],
  )

  const totalCards = deckCards.reduce((sum, c) => sum + c.quantity, 0)
  const selectedCardDisabled = selectedCard ? isDisabled(selectedCard) : false
  const currentQtyInDeck = selectedCard
    ? (deckCards.find((c) => c.card.id === selectedCard.id)?.quantity ?? 0)
    : 0
  const applyBtnLabel =
    pendingQty === 0 && currentQtyInDeck > 0
      ? 'デッキから削除'
      : currentQtyInDeck > 0
        ? '更新'
        : 'デッキに追加'

  if (!deck) return <div className="loading">読み込み中...</div>

  return (
    <div className="page deck-builder-page">
      <header className="page__header">
        <button className="btn btn--ghost" onClick={() => navigate('/')}>
          ← 一覧へ
        </button>
        <input
          className="deck-name-input"
          value={deckName}
          onChange={(e) => setDeckName(e.target.value)}
          placeholder="デッキ名"
        />
        <span className="card-count">{total.toLocaleString()} 件</span>
        <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </button>
      </header>

      {errors.length > 0 && (
        <ul className="deck-errors-banner">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}

      {/* デッキサムネイルストリップ */}
      <div className="deck-strip">
        <div className="deck-strip__bar">
          {deck.leader && (
            <img src={`/image/${deck.leader.id}`} alt="" className="deck-strip__leader" />
          )}
          <span className={totalCards === 50 ? 'count--ok' : 'count--ng'}>
            {totalCards} / 50 枚
          </span>
        </div>
        <div className="deck-strip__scroll">
          {deckCards.length === 0 ? (
            <span className="deck-strip__empty">下のグリッドからカードを追加してください</span>
          ) : (
            sortDeckCards(deckCards).map(({ card, quantity }) => (
              <div key={card.id} className="deck-strip__item" onClick={() => openCardModal(card)}>
                <img src={`/image/${card.id}`} alt={card.name ?? card.name_en} />
                <span className="deck-strip__badge">×{quantity}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="deck-builder-layout">
        <div className="deck-builder-left">
          <div className="deck-builder-toolbar">
            <div className="toolbar-row">
              <SearchBar
                value={filters.q ?? ''}
                onChange={(q) => handleFilterChange({ ...filters, q: q || undefined })}
              />
              <select
                className="sort-select"
                value={filters.sort ?? 'id'}
                onChange={(e) => handleFilterChange({ ...filters, sort: e.target.value })}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <FilterPanel
              filters={filters}
              onChange={handleFilterChange}
              hideCategories={['Leader']}
            />
          </div>

          <div className="card-grid-wrap">
            <CardGrid
              cards={cards}
              onCardClick={openCardModal}
              getBadge={getBadge}
              isDisabled={isDisabled}
              onScrollEnd={handleScrollEnd}
            />
            {loading && <div className="loading-bar">読み込み中...</div>}
          </div>
        </div>
      </div>

      {/* カード詳細 & 追加モーダル */}
      {selectedCard && (
        <div className="modal-overlay" onClick={() => setSelectedCard(null)}>
          <div className="modal-content card-add-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedCard(null)}>
              ✕
            </button>

            <img
              src={`/image/${selectedCard.id}`}
              alt={selectedCard.name ?? selectedCard.name_en}
              className="card-add-modal__img"
            />

            <div className="card-add-modal__body">
              <div>
                <h2>{selectedCard.name ?? selectedCard.name_en}</h2>
                {selectedCard.name_en && (
                  <p className="card-add-modal__name-en">{selectedCard.name_en}</p>
                )}
              </div>

              <table>
                <tbody>
                  <tr>
                    <th>カード番号</th>
                    <td>{selectedCard.id}</td>
                  </tr>
                  <tr>
                    <th>種別</th>
                    <td>{selectedCard.category}</td>
                  </tr>
                  <tr>
                    <th>色</th>
                    <td>{selectedCard.color}</td>
                  </tr>
                  {selectedCard.cost != null && (
                    <tr>
                      <th>コスト</th>
                      <td>{selectedCard.cost}</td>
                    </tr>
                  )}
                  {selectedCard.power != null && (
                    <tr>
                      <th>パワー</th>
                      <td>{selectedCard.power.toLocaleString()}</td>
                    </tr>
                  )}
                  {selectedCard.counter != null && (
                    <tr>
                      <th>カウンター</th>
                      <td>{selectedCard.counter}</td>
                    </tr>
                  )}
                  {selectedCard.attribute && (
                    <tr>
                      <th>属性</th>
                      <td>{selectedCard.attribute}</td>
                    </tr>
                  )}
                  {selectedCard.sub_types && (
                    <tr>
                      <th>特徴</th>
                      <td>{selectedCard.sub_types}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {(selectedCard.effect_text ?? selectedCard.effect_text_en) && (
                <p className="card-add-modal__effect">
                  {selectedCard.effect_text ?? selectedCard.effect_text_en}
                </p>
              )}

              {selectedCardDisabled && (
                <p className="card-add-modal__warn">リーダーの色と合わないため追加できません</p>
              )}

              <div className="card-add-modal__qty">
                <button
                  onClick={() => setPendingQty((q) => Math.max(0, q - 1))}
                  disabled={pendingQty === 0}
                >
                  −
                </button>
                <span className="card-add-modal__qty-num">{pendingQty}</span>
                <button
                  onClick={() => setPendingQty((q) => Math.min(4, q + 1))}
                  disabled={pendingQty >= 4 || selectedCardDisabled}
                >
                  ＋
                </button>
                {currentQtyInDeck > 0 && (
                  <span className="card-add-modal__qty-label">現在 {currentQtyInDeck} 枚</span>
                )}
              </div>

              <div className="card-add-modal__footer">
                <button
                  className="btn btn--primary"
                  onClick={handleApplyQty}
                  disabled={
                    (selectedCardDisabled && pendingQty > 0) ||
                    (pendingQty === 0 && currentQtyInDeck === 0)
                  }
                >
                  {applyBtnLabel}
                </button>
                <button className="btn" onClick={() => setSelectedCard(null)}>
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
