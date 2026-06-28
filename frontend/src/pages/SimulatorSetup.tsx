import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { DeckSummary } from '../types'
import { AppHeader } from '../components/AppHeader'

function DeckPickerPanel({
  label,
  selected,
  onSelect,
  decks,
}: {
  label: string
  selected: DeckSummary | null
  onSelect: (d: DeckSummary) => void
  decks: DeckSummary[]
}) {
  return (
    <div className={`setup-picker-panel ${selected ? 'setup-picker-panel--selected' : ''}`}>
      <div className="setup-picker-label">{label}</div>

      {selected ? (
        <div className="setup-picker-chosen">
          <div className="setup-picker-chosen__img-wrap">
            {selected.leader ? (
              <img
                src={`/image/${selected.leader.id}`}
                alt={selected.leader.name ?? selected.leader.name_en ?? ''}
                className="setup-picker-chosen__img"
              />
            ) : (
              <div className="setup-picker-chosen__no-img">?</div>
            )}
          </div>
          <div className="setup-picker-chosen__info">
            <div className="setup-picker-chosen__name">{selected.name}</div>
            {selected.leader && (
              <div className="setup-picker-chosen__leader">
                {selected.leader.name ?? selected.leader.name_en}
              </div>
            )}
            <div className={`setup-picker-chosen__count ${selected.total_cards > 0 && selected.total_cards <= 50 ? 'count--ok' : 'count--ng'}`}>
              {selected.total_cards}/50 枚
            </div>
            <button className="btn btn--sm" onClick={() => onSelect(selected)}>
              変更
            </button>
          </div>
        </div>
      ) : (
        <div className="setup-picker-grid">
          {decks.length === 0 ? (
            <div className="setup-picker-empty">デッキがありません</div>
          ) : (
            decks.map((deck) => {
              const ready = deck.total_cards > 0 && deck.total_cards <= 50
              return (
                <button
                  key={deck.id}
                  className={`setup-deck-tile${ready ? '' : ' setup-deck-tile--disabled'}`}
                  onClick={() => ready && onSelect(deck)}
                  disabled={!ready}
                  title={ready ? deck.name : `${deck.total_cards}枚（1〜50枚のデッキのみ選択できます）`}
                >
                  <div className="setup-deck-tile__img-wrap">
                    {deck.leader ? (
                      <img
                        src={`/image/${deck.leader.id}`}
                        alt={deck.leader.name ?? deck.leader.name_en ?? ''}
                        className="setup-deck-tile__img"
                      />
                    ) : (
                      <div className="setup-deck-tile__no-img">?</div>
                    )}
                  </div>
                  <div className="setup-deck-tile__name">{deck.name}</div>
                  <div className={`setup-deck-tile__count ${deck.total_cards > 0 && deck.total_cards <= 50 ? 'count--ok' : 'count--ng'}`}>
                    {deck.total_cards}/50
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export function SimulatorSetup() {
  const navigate = useNavigate()
  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [deckA, setDeckA] = useState<DeckSummary | null>(null)
  const [deckB, setDeckB] = useState<DeckSummary | null>(null)
  const [firstPlayer, setFirstPlayer] = useState<'A' | 'B'>('A')

  useEffect(() => {
    api
      .getDecks()
      .then(setDecks)
      .finally(() => setLoading(false))
  }, [])

  const handleSelectA = useCallback(
    (d: DeckSummary) => {
      setDeckA((prev) => (prev?.id === d.id ? null : d))
    },
    [],
  )

  const handleSelectB = useCallback(
    (d: DeckSummary) => {
      setDeckB((prev) => (prev?.id === d.id ? null : d))
    },
    [],
  )

  const canStart = deckA && deckB

  const handleStart = () => {
    if (!deckA || !deckB) return
    const firstId = firstPlayer === 'A' ? deckA.id : deckB.id
    const secondId = firstPlayer === 'A' ? deckB.id : deckA.id
    navigate(`/duel/${firstId}/${secondId}`)
  }

  const decksForA = decks.filter((d) => d.id !== deckB?.id)
  const decksForB = decks.filter((d) => d.id !== deckA?.id)

  if (loading) return <div className="loading">読み込み中...</div>

  return (
    <div className="setup-page">
      <AppHeader back={{ to: '/', label: 'ホーム' }} title="1人回し セットアップ" />

      <div className="setup-body">
        <div className="setup-pickers">
          <DeckPickerPanel
            label="プレイヤー A"
            selected={deckA}
            onSelect={handleSelectA}
            decks={decksForA}
          />
          <div className="setup-vs">VS</div>
          <DeckPickerPanel
            label="プレイヤー B"
            selected={deckB}
            onSelect={handleSelectB}
            decks={decksForB}
          />
        </div>

        {deckA && deckB && (
          <div className="setup-order">
            <div className="setup-order__title">先行を選択</div>
            <div className="setup-order__options">
              <button
                className={`setup-order-btn ${firstPlayer === 'A' ? 'setup-order-btn--active' : ''}`}
                onClick={() => setFirstPlayer('A')}
              >
                <div className="setup-order-btn__badge">先行</div>
                <div className="setup-order-btn__name">{deckA.name}</div>
                {deckA.leader && (
                  <div className="setup-order-btn__leader">
                    {deckA.leader.name ?? deckA.leader.name_en}
                  </div>
                )}
              </button>
              <div className="setup-order__arrow">⇄</div>
              <button
                className={`setup-order-btn ${firstPlayer === 'B' ? 'setup-order-btn--active' : ''}`}
                onClick={() => setFirstPlayer('B')}
              >
                <div className="setup-order-btn__badge">先行</div>
                <div className="setup-order-btn__name">{deckB.name}</div>
                {deckB.leader && (
                  <div className="setup-order-btn__leader">
                    {deckB.leader.name ?? deckB.leader.name_en}
                  </div>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="setup-footer">
          {!deckA && <div className="setup-hint">プレイヤー A のデッキを選択してください</div>}
          {deckA && !deckB && <div className="setup-hint">プレイヤー B のデッキを選択してください</div>}
          {canStart && (
            <button className="btn btn--primary btn--lg" onClick={handleStart}>
              マリガンへ進む →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
