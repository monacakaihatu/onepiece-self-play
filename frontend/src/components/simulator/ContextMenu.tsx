import { useEffect, useRef } from 'react'
import { useGameStore } from '../../store/gameStore'
import type { ZoneId } from '../../types/game'

const MOVE_ZONES: { label: string; zone: ZoneId }[] = [
  { label: '手札へ', zone: 'hand' },
  { label: 'フィールドへ', zone: 'field' },
  { label: '墓地へ', zone: 'graveyard' },
  { label: '山札トップへ', zone: 'deck' },
  { label: 'ライフへ', zone: 'life' },
  { label: '除外へ', zone: 'excluded' },
]

export function ContextMenu() {
  const contextMenu = useGameStore((s) => s.contextMenu)
  const cards = useGameStore((s) => s.cards)
  const { closeContextMenu, moveCard, toggleRest, adjustPower, resetPower, detachAllDon } = useGameStore.getState()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contextMenu) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeContextMenu()
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [contextMenu, closeContextMenu])

  if (!contextMenu) return null

  const { instanceId, x, y } = contextMenu
  const card = cards[instanceId]
  if (!card) return null

  // Clamp position to viewport
  const menuW = 200
  const menuH = 320
  const left = Math.min(x, window.innerWidth - menuW - 8)
  const top = Math.min(y, window.innerHeight - menuH - 8)

  const handleMove = (zone: ZoneId) => {
    const opts: { toTop?: boolean } = zone === 'deck' ? { toTop: true } : {}
    moveCard(instanceId, zone, opts)
    closeContextMenu()
  }

  const copyText = () => {
    const text = `${card.card.name ?? card.card.name_en}\n${card.card.effect_text ?? card.card.effect_text_en ?? ''}`
    navigator.clipboard.writeText(text).catch(() => {})
    closeContextMenu()
  }

  return (
    <div
      ref={ref}
      className="sim-context-menu"
      style={{ left, top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="sim-context-menu__title">
        {card.card.name ?? card.card.name_en}
      </div>

      <button
        className="sim-context-menu__item"
        onClick={() => { toggleRest(instanceId); closeContextMenu() }}
      >
        {card.rested ? 'アクティブ (立てる)' : 'レスト (横にする)'}
      </button>

      <div className="sim-context-menu__sep" />

      <div className="sim-context-menu__label">パワー修正</div>
      <div className="sim-context-menu__row">
        {[-2000, -1000].map((d) => (
          <button
            key={d}
            className="sim-context-menu__item sim-context-menu__item--sm"
            onClick={() => { adjustPower(instanceId, d); closeContextMenu() }}
          >
            {d}
          </button>
        ))}
        {[+1000, +2000].map((d) => (
          <button
            key={d}
            className="sim-context-menu__item sim-context-menu__item--sm"
            onClick={() => { adjustPower(instanceId, d); closeContextMenu() }}
          >
            +{d}
          </button>
        ))}
      </div>
      {card.powerMod !== 0 && (
        <button
          className="sim-context-menu__item"
          onClick={() => { resetPower(instanceId); closeContextMenu() }}
        >
          パワーリセット
        </button>
      )}

      {card.donAttached > 0 && (
        <button
          className="sim-context-menu__item"
          onClick={() => { detachAllDon(instanceId); closeContextMenu() }}
        >
          ドン!! を全て外す
        </button>
      )}

      <div className="sim-context-menu__sep" />

      <div className="sim-context-menu__label">移動</div>
      {MOVE_ZONES.filter((z) => z.zone !== card.zone).map(({ label, zone }) => (
        <button
          key={zone}
          className="sim-context-menu__item"
          onClick={() => handleMove(zone)}
        >
          {label}
        </button>
      ))}

      <div className="sim-context-menu__sep" />

      <button className="sim-context-menu__item" onClick={copyText}>
        テキストをコピー
      </button>
    </div>
  )
}
