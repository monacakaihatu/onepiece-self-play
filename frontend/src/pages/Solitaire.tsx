import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Card, DeckDetail } from '../types'

// ─── Types ───────────────────────────────────────────────────────

type Phase = 'loading' | 'setup' | 'mulligan' | 'refresh' | 'draw' | 'don' | 'main' | 'battle' | 'end'

interface FieldChar {
  uid: string
  card: Card
  rested: boolean
  don: number
}

interface GameState {
  phase: Phase
  turn: number
  deckPile: Card[]
  hand: Card[]
  field: FieldChar[]
  stage: Card | null
  leader: Card
  lifeCards: Card[]
  trash: Card[]
  donActive: number
  donRested: number
  donTotal: number
  firstTurn: boolean
  mulliganDone: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function uid(): string {
  return Math.random().toString(36).slice(2)
}

function expandDeck(deck: DeckDetail): Card[] {
  return deck.cards.flatMap(({ card, quantity }) => Array(quantity).fill(card))
}

function buildInitialState(deck: DeckDetail): GameState {
  const leader = deck.leader!
  const life = parseInt(leader.life ?? '4', 10)
  const pile = shuffle(expandDeck(deck))
  const lifeCards = pile.splice(0, life)
  const hand = pile.splice(0, 5)
  return {
    phase: 'mulligan',
    turn: 1,
    deckPile: pile,
    hand,
    field: [],
    stage: null,
    leader,
    lifeCards,
    trash: [],
    donActive: 0,
    donRested: 0,
    donTotal: 0,
    firstTurn: true,
    mulliganDone: false,
  }
}

// ─── Context-menu hook ────────────────────────────────────────────

interface CtxMenu {
  x: number
  y: number
  items: { label: string; danger?: boolean; action: () => void }[]
}

// ─── Component ───────────────────────────────────────────────────

export function Solitaire() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const deckId = Number(id)

  const [deck, setDeck] = useState<DeckDetail | null>(null)
  const [gs, setGs] = useState<GameState | null>(null)
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)
  const ctxRef = useRef<HTMLDivElement>(null)

  // Load deck
  useEffect(() => {
    api.getDeck(deckId).then((d) => {
      setDeck(d)
      if (d.leader) {
        setGs(buildInitialState(d))
      }
    })
  }, [deckId])

  // Close context menu on outside click
  useEffect(() => {
    const handler = () => setCtxMenu(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const openCtx = useCallback((e: React.MouseEvent, items: CtxMenu['items']) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ x: e.clientX, y: e.clientY, items })
  }, [])

  // ── Mulligan ──
  const handleKeep = useCallback(() => {
    setGs((prev) => prev && { ...prev, phase: 'refresh', mulliganDone: true })
  }, [])

  const handleMulligan = useCallback(() => {
    setGs((prev) => {
      if (!prev) return prev
      const pile = shuffle([...prev.deckPile, ...prev.hand])
      const hand = pile.splice(0, 5)
      return { ...prev, deckPile: pile, hand, phase: 'refresh', mulliganDone: true }
    })
  }, [])

  // ── Turn phases ──
  const nextPhase = useCallback(() => {
    setGs((prev) => {
      if (!prev) return prev
      const order: Phase[] = ['refresh', 'draw', 'don', 'main', 'battle', 'end']
      const idx = order.indexOf(prev.phase as Phase)
      if (idx === -1) return prev
      if (prev.phase === 'end') {
        // Start next turn
        const newDonTotal = Math.min(prev.donTotal + 2, 10)
        return {
          ...prev,
          phase: 'refresh',
          turn: prev.turn + 1,
          firstTurn: false,
          donActive: newDonTotal,
          donRested: 0,
          donTotal: newDonTotal,
          field: prev.field.map((c) => ({ ...c, rested: false })),
        }
      }
      const next = order[idx + 1]
      let updates: Partial<GameState> = { phase: next }
      if (next === 'draw' && !prev.firstTurn) {
        // draw 1
        const pile = [...prev.deckPile]
        const card = pile.shift()
        updates = { ...updates, deckPile: pile, hand: card ? [...prev.hand, card] : prev.hand }
      }
      if (next === 'don' && !prev.firstTurn) {
        const addDon = Math.min(2, 10 - prev.donTotal)
        updates = {
          ...updates,
          donTotal: prev.donTotal + addDon,
          donActive: prev.donActive + addDon,
        }
      }
      if (next === 'refresh') {
        updates = {
          ...updates,
          field: prev.field.map((c) => ({ ...c, rested: false })),
          donActive: prev.donTotal,
          donRested: 0,
        }
      }
      return { ...prev, ...updates }
    })
  }, [])

  // ── Draw card ──
  const drawCard = useCallback(() => {
    setGs((prev) => {
      if (!prev || prev.deckPile.length === 0) return prev
      const pile = [...prev.deckPile]
      const card = pile.shift()!
      return { ...prev, deckPile: pile, hand: [...prev.hand, card] }
    })
  }, [])

  // ── Play card from hand ──
  const playCard = useCallback((card: Card, handIdx: number) => {
    setGs((prev) => {
      if (!prev) return prev
      const newHand = prev.hand.filter((_, i) => i !== handIdx)
      if (card.category === 'Character') {
        const cost = card.cost ?? 0
        const donToRest = Math.min(cost, prev.donActive)
        return {
          ...prev,
          hand: newHand,
          donActive: prev.donActive - donToRest,
          donRested: prev.donRested + donToRest,
          field: [...prev.field, { uid: uid(), card, rested: false, don: 0 }],
        }
      }
      if (card.category === 'Stage') {
        return { ...prev, hand: newHand, stage: card }
      }
      // Event / default → trash
      return { ...prev, hand: newHand, trash: [card, ...prev.trash] }
    })
  }, [])

  // ── Toggle rest ──
  const toggleRest = useCallback((charUid: string) => {
    setGs((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        field: prev.field.map((c) =>
          c.uid === charUid ? { ...c, rested: !c.rested } : c,
        ),
      }
    })
  }, [])

  // ── Don pip toggle ──
  const toggleDon = useCallback((idx: number) => {
    setGs((prev) => {
      if (!prev) return prev
      const isActive = idx < prev.donActive
      if (isActive) {
        return { ...prev, donActive: prev.donActive - 1, donRested: prev.donRested + 1 }
      } else {
        const restIdx = idx - prev.donActive
        if (restIdx < prev.donRested) {
          return { ...prev, donActive: prev.donActive + 1, donRested: prev.donRested - 1 }
        }
      }
      return prev
    })
  }, [])

  // ── Remove character ──
  const removeChar = useCallback((charUid: string, toTrash = true) => {
    setGs((prev) => {
      if (!prev) return prev
      const char = prev.field.find((c) => c.uid === charUid)
      if (!char) return prev
      return {
        ...prev,
        field: prev.field.filter((c) => c.uid !== charUid),
        trash: toTrash ? [char.card, ...prev.trash] : prev.trash,
      }
    })
  }, [])

  // ── Damage / life hit ──
  const hitLife = useCallback(() => {
    setGs((prev) => {
      if (!prev || prev.lifeCards.length === 0) return prev
      const lifeCards = [...prev.lifeCards]
      const card = lifeCards.shift()!
      return { ...prev, lifeCards, hand: [...prev.hand, card] }
    })
  }, [])

  // ── Return hand card to deck ──
  const returnToDeck = useCallback((handIdx: number) => {
    setGs((prev) => {
      if (!prev) return prev
      const card = prev.hand[handIdx]
      const hand = prev.hand.filter((_, i) => i !== handIdx)
      return { ...prev, hand, deckPile: shuffle([card, ...prev.deckPile]) }
    })
  }, [])

  // ── Discard hand card ──
  const discardHand = useCallback((handIdx: number) => {
    setGs((prev) => {
      if (!prev) return prev
      const card = prev.hand[handIdx]
      const hand = prev.hand.filter((_, i) => i !== handIdx)
      return { ...prev, hand, trash: [card, ...prev.trash] }
    })
  }, [])

  if (!gs || !deck) return <div className="loading">読み込み中...</div>

  const phaseLabel: Record<Phase, string> = {
    loading: '...', setup: 'セットアップ', mulligan: 'マリガン',
    refresh: 'リフレッシュ', draw: 'ドロー', don: 'DON!!', main: 'メイン', battle: 'バトル', end: '終了',
  }
  const phaseCls: Record<Phase, string> = {
    loading: '', setup: 'setup', mulligan: 'mulligan',
    refresh: 'refresh', draw: 'draw', don: 'don', main: 'main', battle: 'battle', end: 'end',
  }

  const isActionable = !['loading', 'setup', 'mulligan'].includes(gs.phase)
  const donTotal = gs.donTotal

  return (
    <div className="solitaire-page">
      {/* Header */}
      <div className="solitaire-header">
        <button className="btn btn--ghost btn--sm" onClick={() => navigate('/')}>← 戻る</button>
        <h2>{deck.name}</h2>
        <span className={`phase-badge phase-badge--${phaseCls[gs.phase]}`}>
          {phaseLabel[gs.phase]}
        </span>
        <span className="turn-counter">ターン {gs.turn}</span>
        <button className="btn btn--sm" style={{ background: 'rgba(224,83,83,0.15)', borderColor: '#e05353', color: '#e05353' }}
          onClick={() => { if (confirm('ゲームをリセットしますか？')) setGs(buildInitialState(deck)) }}>
          リセット
        </button>
      </div>

      {/* Mulligan overlay */}
      {gs.phase === 'mulligan' && (
        <div className="setup-overlay">
          <div className="setup-panel">
            <h2>マリガン</h2>
            <p style={{ textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
              手札 {gs.hand.length} 枚。引き直しますか？（1回のみ）
            </p>
            <div className="mulligan-hand">
              {gs.hand.map((card, i) => (
                <div key={i} className="mulligan-card">
                  <img src={`/image/${card.id}`} alt={card.name ?? card.name_en ?? ''} />
                </div>
              ))}
            </div>
            <div className="mulligan-actions">
              <button className="btn btn--primary" style={{ minWidth: 120 }} onClick={handleKeep}>
                キープ
              </button>
              <button className="btn" style={{ minWidth: 120 }} onClick={handleMulligan}>
                マリガン
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="solitaire-main">
        {/* Field */}
        <div className="solitaire-field">
          {/* Leader + Life */}
          <div>
            <div className="field-zone-label">ライフ / リーダー</div>
            <div className="leader-life-row">
              <div className="leader-card-wrap" title="リーダー">
                <img src={`/image/${gs.leader.id}`} alt={gs.leader.name ?? ''} />
              </div>
              <div className="life-zone">
                {gs.lifeCards.map((card, i) => (
                  <div
                    key={i}
                    className="life-card life-card--face-down"
                    title="ライフカード（クリックでダメージ）"
                    onClick={() => hitLife()}
                  >
                    <img src={`/image/${card.id}`} alt="" />
                  </div>
                ))}
                {gs.lifeCards.length === 0 && (
                  <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 700 }}>ライフ0</span>
                )}
              </div>
            </div>
          </div>

          {/* Stage */}
          {gs.stage && (
            <div>
              <div className="field-zone-label">ステージ</div>
              <div className="stage-zone">
                <div
                  className="stage-card-wrap"
                  onContextMenu={(e) =>
                    openCtx(e, [
                      { label: 'トラッシュへ', danger: true, action: () => setGs((p) => p && { ...p, stage: null, trash: [gs.stage!, ...p.trash] }) },
                    ])
                  }
                >
                  <img src={`/image/${gs.stage.id}`} alt={gs.stage.name ?? ''} />
                </div>
              </div>
            </div>
          )}

          {/* Characters */}
          <div className="character-field">
            <div className="field-zone-label">キャラクター ({gs.field.length}体)</div>
            <div className="character-slots">
              {gs.field.map((fc) => (
                <div key={fc.uid} className="char-slot">
                  <div
                    className={`char-card${fc.rested ? ' char-card--rested' : ''}`}
                    onClick={() => toggleRest(fc.uid)}
                    onContextMenu={(e) =>
                      openCtx(e, [
                        { label: fc.rested ? 'アクティブ' : 'レスト', action: () => toggleRest(fc.uid) },
                        { label: 'トラッシュへ', danger: true, action: () => removeChar(fc.uid, true) },
                        { label: '手札に戻す', action: () => {
                          setGs((p) => {
                            if (!p) return p
                            const c = p.field.find((x) => x.uid === fc.uid)
                            if (!c) return p
                            return { ...p, field: p.field.filter((x) => x.uid !== fc.uid), hand: [...p.hand, c.card] }
                          })
                        }},
                      ])
                    }
                    title={`${fc.card.name ?? fc.card.name_en} (クリック: レスト切替 / 右クリック: メニュー)`}
                  >
                    <img src={`/image/${fc.card.id}`} alt={fc.card.name ?? ''} />
                    {fc.don > 0 && <span className="char-card__don">{fc.don}</span>}
                  </div>
                </div>
              ))}
              {gs.field.length < 5 && (
                <div className="char-slot">
                  <div className="char-slot--empty">＋</div>
                </div>
              )}
            </div>
          </div>

          {/* DON!! */}
          <div className="don-zone">
            <span className="don-zone-label">DON!! {gs.donActive}A / {gs.donRested}R / {donTotal}枚</span>
            <div className="don-pips">
              {Array.from({ length: donTotal }, (_, i) => {
                const isActive = i < gs.donActive
                return (
                  <div
                    key={i}
                    className={`don-pip ${isActive ? 'don-pip--active' : 'don-pip--rested'}`}
                    onClick={() => toggleDon(i)}
                    title={isActive ? 'レストにする' : 'アクティブにする'}
                  >
                    !!
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="solitaire-sidebar">
          {/* Deck / Trash counters */}
          <div className="sidebar-section">
            <h4>デッキ / トラッシュ</h4>
            <div className="deck-counters">
              <div className="deck-counter" onClick={drawCard} title="クリックでドロー">
                <span className="deck-counter__num">{gs.deckPile.length}</span>
                <span className="deck-counter__lbl">デッキ</span>
              </div>
              <div
                className="deck-counter"
                title={`トラッシュ ${gs.trash.length}枚`}
                onContextMenu={(e) =>
                  openCtx(e, [
                    {
                      label: 'デッキに戻す（シャッフル）',
                      action: () =>
                        setGs((p) => p && { ...p, deckPile: shuffle([...p.deckPile, ...p.trash]), trash: [] }),
                    },
                  ])
                }
              >
                <span className="deck-counter__num">{gs.trash.length}</span>
                <span className="deck-counter__lbl">トラッシュ</span>
              </div>
            </div>
          </div>

          {/* Phase controls */}
          <div className="sidebar-section">
            <h4>フェーズ</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {gs.phase === 'refresh' && (
                <button className="phase-btn phase-btn--primary" onClick={nextPhase}>ドローフェーズへ →</button>
              )}
              {gs.phase === 'draw' && (
                <>
                  {gs.firstTurn ? (
                    <button className="phase-btn phase-btn--primary" onClick={nextPhase}>DON!!フェーズへ → (1T ドローなし)</button>
                  ) : (
                    <button className="phase-btn phase-btn--primary" onClick={nextPhase}>ドロー & DON!!フェーズへ →</button>
                  )}
                </>
              )}
              {gs.phase === 'don' && (
                <button className="phase-btn phase-btn--primary" onClick={nextPhase}>メインフェーズへ →</button>
              )}
              {gs.phase === 'main' && (
                <button className="phase-btn phase-btn--primary" onClick={nextPhase}>バトルフェーズへ →</button>
              )}
              {gs.phase === 'battle' && (
                <button className="phase-btn phase-btn--primary" onClick={nextPhase}>エンドフェーズへ →</button>
              )}
              {gs.phase === 'end' && (
                <button className="phase-btn phase-btn--primary" onClick={nextPhase}>次のターン →</button>
              )}
            </div>
          </div>

          {/* Hand */}
          <div className="hand-section">
            <h4>手札 ({gs.hand.length}枚)</h4>
            <div className="hand-cards">
              {gs.hand.map((card, i) => (
                <div
                  key={i}
                  className="hand-card"
                  onClick={() => isActionable && playCard(card, i)}
                  onContextMenu={(e) =>
                    openCtx(e, [
                      { label: 'プレイする', action: () => playCard(card, i) },
                      { label: 'トラッシュへ', danger: true, action: () => discardHand(i) },
                      { label: 'デッキに戻す', action: () => returnToDeck(i) },
                    ])
                  }
                  title="左クリック: プレイ / 右クリック: メニュー"
                >
                  <img src={`/image/${card.id}`} alt={card.name ?? card.name_en ?? ''} />
                  <div className="hand-card__info">
                    <div className="hand-card__name">{card.name ?? card.name_en}</div>
                    <div className="hand-card__meta">
                      {card.category}
                      {card.cost != null && ` · コスト${card.cost}`}
                    </div>
                  </div>
                </div>
              ))}
              {gs.hand.length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--text2)', padding: 8 }}>手札なし</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          ref={ctxRef}
          className="card-action-menu"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {ctxMenu.items.map((item, i) => (
            <button
              key={i}
              className={item.danger ? 'danger' : ''}
              onClick={() => { item.action(); setCtxMenu(null) }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
