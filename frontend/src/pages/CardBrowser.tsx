import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Card, CardFilters } from '../types'
import { CardGrid } from '../components/CardGrid'
import { CardDetail } from '../components/CardDetail'
import { SearchBar } from '../components/SearchBar'
import { FilterPanel } from '../components/FilterPanel'

const PAGE_SIZE = 100

const COLS_OPTIONS = [
  { value: undefined, label: '自動' },
  { value: 4, label: '4' },
  { value: 6, label: '6' },
  { value: 8, label: '8' },
  { value: 10, label: '10' },
  { value: 12, label: '12' },
]

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

export function CardBrowser() {
  const navigate = useNavigate()
  const [cards, setCards] = useState<Card[]>([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<CardFilters>({ limit: PAGE_SIZE, offset: 0, sort: 'id' })
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [colsOverride, setColsOverride] = useState<number | undefined>(undefined)

  const fetchCards = useCallback(async (f: CardFilters, append = false) => {
    setLoading(true)
    try {
      const res = await api.getCards(f)
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

  return (
    <div className="page">
      <header className="page__header">
        <h1>カード一覧</h1>
        <span className="card-count">{total.toLocaleString()} 件</span>
        <button className="btn btn--ghost" onClick={() => navigate('/')}>
          デッキ一覧
        </button>
      </header>

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
              <div className="cols-toggle">
                {COLS_OPTIONS.map((o) => (
                  <button
                    key={o.label}
                    className={`cols-toggle__btn${colsOverride === o.value ? ' cols-toggle__btn--active' : ''}`}
                    onClick={() => setColsOverride(o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <FilterPanel filters={filters} onChange={handleFilterChange} />
          </div>

          <div className="card-grid-wrap">
            <CardGrid cards={cards} onCardClick={setSelectedCard} onScrollEnd={handleScrollEnd} cols={colsOverride} />
            {loading && <div className="loading-bar">読み込み中...</div>}
          </div>
        </div>
      </div>

      {selectedCard && <CardDetail card={selectedCard} onClose={() => setSelectedCard(null)} />}
    </div>
  )
}
