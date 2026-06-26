import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Card, DeckDetail, DeckSummary } from '../types'
import { CardGrid } from '../components/CardGrid'

export function DeckList() {
  const navigate = useNavigate()
  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [leaderQuery, setLeaderQuery] = useState('')
  const [leaders, setLeaders] = useState<Card[]>([])
  const [previewDeck, setPreviewDeck] = useState<DeckDetail | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    api
      .getDecks()
      .then(setDecks)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!showCreate) return
    api
      .getCards({ category: ['Leader'], q: leaderQuery || undefined, limit: 500, sort: 'id' })
      .then((r) => setLeaders(r.items))
  }, [showCreate, leaderQuery])

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm('デッキを削除しますか？')) return
      await api.deleteDeck(id)
      setDecks((prev) => prev.filter((d) => d.id !== id))
      if (previewDeck?.id === id) setPreviewDeck(null)
    },
    [previewDeck?.id],
  )

  const handleDeckClick = useCallback(async (id: number) => {
    setPreviewLoading(true)
    try {
      const detail = await api.getDeck(id)
      setPreviewDeck(detail)
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  const handleCreate = useCallback(
    async (leader: Card) => {
      if (!newName.trim()) {
        alert('デッキ名を入力してください')
        return
      }
      const deck = await api.createDeck(newName.trim(), leader.id)
      navigate(`/deck/${deck.id}`)
    },
    [newName, navigate],
  )

  if (loading) return <div className="loading">読み込み中...</div>

  return (
    <div className="page deck-list-page">
      <header className="page__header">
        <button className="btn btn--ghost" onClick={() => navigate('/')}>← ホーム</button>
        <h1>デッキ一覧</h1>
        <Link to="/cards" className="btn btn--ghost">
          カード一覧
        </Link>
        <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
          ＋ 新規デッキ
        </button>
      </header>

      {decks.length === 0 && !showCreate && (
        <p className="empty-state">デッキがまだありません。新規作成してみましょう。</p>
      )}

      <div className="deck-grid">
        {decks.map((deck) => (
          <div key={deck.id} className="deck-card-tile" onClick={() => handleDeckClick(deck.id)}>
            <div className="deck-card-tile__img-wrap">
              {deck.leader ? (
                <img
                  src={`/image/${deck.leader.id}`}
                  alt={deck.leader.name ?? deck.leader.name_en ?? ''}
                  className="deck-card-tile__img"
                />
              ) : (
                <div className="deck-card-tile__no-img">?</div>
              )}
              <span className={`deck-card-tile__count ${deck.total_cards === 50 ? 'count--ok' : 'count--ng'}`}>
                {deck.total_cards}/50
              </span>
            </div>
            <div className="deck-card-tile__footer">
              <span className="deck-card-tile__name">{deck.name}</span>
              {deck.leader && (
                <span className="deck-card-tile__leader">
                  {deck.leader.name ?? deck.leader.name_en}
                </span>
              )}
            </div>
            <button
              className="deck-card-tile__del"
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(deck.id)
              }}
              title="削除"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* デッキプレビューモーダル */}
      {(previewDeck || previewLoading) && (
        <div className="modal-overlay" onClick={() => setPreviewDeck(null)}>
          <div
            className="modal-content modal-content--wide deck-preview"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setPreviewDeck(null)}>
              ✕
            </button>

            {previewLoading && <div className="loading">読み込み中...</div>}

            {previewDeck && (
              <>
                <div className="deck-preview__header">
                  {previewDeck.leader && (
                    <img
                      src={`/image/${previewDeck.leader.id}`}
                      alt={previewDeck.leader.name ?? previewDeck.leader.name_en ?? ''}
                      className="deck-preview__leader-img"
                    />
                  )}
                  <div className="deck-preview__meta">
                    <h2>{previewDeck.name}</h2>
                    {previewDeck.leader && (
                      <span className="deck-preview__leader-name">
                        {previewDeck.leader.name ?? previewDeck.leader.name_en}
                      </span>
                    )}
                    <span className={previewDeck.total_cards === 50 ? 'count--ok' : 'count--ng'}>
                      {previewDeck.total_cards} / 50 枚
                    </span>
                  </div>
                </div>

                <div className="deck-preview__cards">
                  {previewDeck.cards.map(({ card, quantity }) => (
                    <div key={card.id} className="deck-preview__row">
                      <img
                        src={`/image/${card.id}`}
                        alt={card.name ?? card.name_en ?? ''}
                        className="deck-preview__row-img"
                      />
                      <span className="deck-preview__row-name">{card.name ?? card.name_en}</span>
                      <span className="deck-preview__row-qty">×{quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="deck-preview__footer">
                  <button
                    className="btn btn--primary"
                    onClick={() => navigate(`/deck/${previewDeck.id}`)}
                  >
                    編集
                  </button>
                  {previewDeck.total_cards === 50 && (
                    <button
                      className="btn btn--accent2"
                      onClick={() => navigate(`/solitaire/${previewDeck.id}`)}
                    >
                      一人回し ▶
                    </button>
                  )}
                  <button className="btn" onClick={() => setPreviewDeck(null)}>
                    閉じる
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 新規デッキ作成モーダル */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content modal-content--wide" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCreate(false)}>
              ✕
            </button>
            <h2>新規デッキ作成</h2>
            <input
              className="input"
              placeholder="デッキ名"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <h3>リーダーを選択</h3>
            <input
              className="search-bar"
              placeholder="リーダー検索..."
              value={leaderQuery}
              onChange={(e) => setLeaderQuery(e.target.value)}
            />
            <div className="leader-grid-wrap">
              <CardGrid cards={leaders} onCardClick={handleCreate} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
