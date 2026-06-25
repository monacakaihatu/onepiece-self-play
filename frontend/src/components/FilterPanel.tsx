import type { CardFilters } from '../types'

const COLORS = ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'Purple']
const JP_COLORS = ['赤', '青', '緑', '黄', '黒', '紫']
const CATEGORIES = ['Leader', 'Character', 'Event', 'Stage']
const COSTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

interface Props {
  filters: CardFilters
  onChange: (filters: CardFilters) => void
  hideCategories?: string[]
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]
}

export function FilterPanel({ filters, onChange, hideCategories = [] }: Props) {
  const colors = filters.color ?? []
  const categories = filters.category ?? []
  const costs = filters.cost ?? []
  const visibleCategories = CATEGORIES.filter((c) => !hideCategories.includes(c))

  return (
    <div className="filter-panel">
      <div className="filter-panel__section">
        <h4>色</h4>
        <div className="filter-panel__chips">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`chip chip--color chip--${c.toLowerCase()}${colors.includes(c) ? ' chip--active' : ''}`}
              onClick={() => onChange({ ...filters, color: toggle(colors, c), offset: 0 })}
            >
              {JP_COLORS[COLORS.indexOf(c)]}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-panel__section">
        <h4>種別</h4>
        <div className="filter-panel__chips">
          {visibleCategories.map((cat) => (
            <button
              key={cat}
              className={`chip${categories.includes(cat) ? ' chip--active' : ''}`}
              onClick={() => onChange({ ...filters, category: toggle(categories, cat), offset: 0 })}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-panel__section">
        <h4>コスト</h4>
        <div className="filter-panel__chips">
          {COSTS.map((cost) => (
            <button
              key={cost}
              className={`chip${costs.includes(cost) ? ' chip--active' : ''}`}
              onClick={() => onChange({ ...filters, cost: toggle(costs, cost), offset: 0 })}
            >
              {cost}
            </button>
          ))}
        </div>
      </div>

      {(colors.length > 0 || categories.length > 0 || costs.length > 0) && (
        <button
          className="btn btn--ghost"
          onClick={() => onChange({ ...filters, color: [], category: [], cost: [], offset: 0 })}
        >
          フィルタをリセット
        </button>
      )}
    </div>
  )
}
