import { useRef, useCallback, useEffect, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Card } from '../types'
import { CardTile } from './CardTile'

const MIN_CARD_W = 120
const GAP = 4
const CARD_ASPECT = 580 / 419

interface Props {
  cards: Card[]
  onCardClick?: (card: Card) => void
  getBadge?: (card: Card) => number | undefined
  isDisabled?: (card: Card) => boolean
  onScrollEnd?: () => void
  cols?: number
}

export function CardGrid({ cards, onCardClick, getBadge, isDisabled, onScrollEnd, cols: colsProp }: Props) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const update = () => {
      const style = getComputedStyle(el)
      const pw = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      setContainerWidth(el.clientWidth - pw)
    }
    const ro = new ResizeObserver(update)
    ro.observe(el)
    update()
    return () => ro.disconnect()
  }, [])

  const cols = colsProp ?? Math.max(1, Math.floor((containerWidth + GAP) / (MIN_CARD_W + GAP)))
  const cardW =
    containerWidth > 0 ? Math.floor((containerWidth - GAP * (cols - 1)) / cols) : MIN_CARD_W
  const cardH = Math.round(cardW * CARD_ASPECT)
  const rowCount = Math.ceil(cards.length / cols)

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => cardH + GAP,
    overscan: 3,
  })

  const handleScroll = useCallback(() => {
    const el = parentRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      onScrollEnd?.()
    }
  }, [onScrollEnd])

  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <div ref={parentRef} className="card-grid-scroll">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vRow) => {
          const startIdx = vRow.index * cols
          const rowCards = cards.slice(startIdx, startIdx + cols)
          return (
            <div
              key={vRow.key}
              style={{
                position: 'absolute',
                top: vRow.start,
                left: 0,
                right: 0,
                display: 'flex',
                gap: GAP,
              }}
            >
              {rowCards.map((card) => (
                <div key={card.id} style={{ width: cardW, flexShrink: 0 }}>
                  <CardTile
                    card={card}
                    onClick={onCardClick}
                    badge={getBadge?.(card)}
                    disabled={isDisabled?.(card)}
                  />
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
