import type { CardFilters } from '../types'

const COLORS = ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'Purple']
const JP_COLORS = ['赤', '青', '緑', '黄', '黒', '紫']
const CATEGORIES = ['Leader', 'Character', 'Event', 'Stage']
const COSTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const RARITIES = ['L', 'SEC', 'SP', 'SR', 'R', 'UC', 'C', 'PR']

const BLOCKS = [
  { value: 'S1', label: 'S1', title: 'OP01〜OP03' },
  { value: 'S2', label: 'S2', title: 'OP04〜OP06' },
  { value: 'S3', label: 'S3', title: 'OP07〜OP09' },
  { value: 'S4', label: 'S4', title: 'OP10〜' },
  { value: 'PROMO', label: 'PROMO', title: 'プロモ・EB' },
]

const SETS = [
  { code: 'OP01', name: 'ROMANCE DAWN' },
  { code: 'OP02', name: '頂上決戦' },
  { code: 'OP03', name: '強大な敵' },
  { code: 'OP04', name: '王国の陰謀' },
  { code: 'OP05', name: '新時代の夜明け' },
  { code: 'OP06', name: '双璧の覇者' },
  { code: 'OP07', name: '500年後の未来' },
  { code: 'OP08', name: '二つの伝説' },
  { code: 'OP09', name: '四皇' },
  { code: 'OP10', name: '王の血脈' },
  { code: 'ST01', name: 'ST-01 麦わらの一味' },
  { code: 'ST02', name: 'ST-02 最悪の世代' },
  { code: 'ST03', name: 'ST-03 七武海' },
  { code: 'ST04', name: 'ST-04 動物系能力者' },
  { code: 'ST05', name: 'ST-05 FILM' },
  { code: 'ST06', name: 'ST-06 世界政府' },
  { code: 'ST07', name: 'ST-07 赤紫ルフィ' },
  { code: 'ST08', name: 'ST-08 ヤマト' },
  { code: 'ST09', name: 'ST-09 ヤミとひかり' },
  { code: 'ST10', name: 'ST-10 ビッグ・マム' },
  { code: 'ST11', name: 'ST-11 麦わらの一味 2' },
  { code: 'ST12', name: 'ST-12 3D2Y' },
  { code: 'ST13', name: 'ST-13 東の海' },
  { code: 'ST14', name: 'ST-14 3キャプテン' },
  { code: 'ST15', name: 'ST-15 黒黄ルフィ' },
  { code: 'ST16', name: 'ST-16 黒紫ルフィ' },
  { code: 'ST17', name: 'ST-17 紫黄ヤマト' },
  { code: 'ST18', name: 'ST-18 赤緑ゾロ' },
  { code: 'ST19', name: 'ST-19 白ひげ海賊団' },
  { code: 'ST20', name: 'ST-20 四皇 vol.1' },
  { code: 'ST21', name: 'ST-21 四皇 vol.2' },
  { code: 'EB01', name: 'EXTRA BOOSTER' },
]

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
  const rarities = filters.rarity ?? []
  const blocks = filters.block ?? []
  const setCodes = filters.set_code ?? []
  const visibleCategories = CATEGORIES.filter((c) => !hideCategories.includes(c))

  const hasFilters =
    colors.length > 0 ||
    categories.length > 0 ||
    costs.length > 0 ||
    rarities.length > 0 ||
    blocks.length > 0 ||
    setCodes.length > 0 ||
    !!filters.sub_types

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

      <div className="filter-panel__section">
        <h4>レアリティ</h4>
        <div className="filter-panel__chips">
          {RARITIES.map((r) => (
            <button
              key={r}
              className={`chip${rarities.includes(r) ? ' chip--active' : ''}`}
              onClick={() => onChange({ ...filters, rarity: toggle(rarities, r), offset: 0 })}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-panel__section">
        <h4>ブロック</h4>
        <div className="filter-panel__chips">
          {BLOCKS.map((b) => (
            <button
              key={b.value}
              className={`chip${blocks.includes(b.value) ? ' chip--active' : ''}`}
              title={b.title}
              onClick={() => onChange({ ...filters, block: toggle(blocks, b.value), offset: 0 })}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-panel__section">
        <h4>収録弾</h4>
        <div className="filter-panel__chips filter-panel__chips--sets">
          {SETS.map((s) => (
            <button
              key={s.code}
              className={`chip chip--set${setCodes.includes(s.code) ? ' chip--active' : ''}`}
              title={s.code}
              onClick={() => onChange({ ...filters, set_code: toggle(setCodes, s.code), offset: 0 })}
            >
              <span className="chip__set-code">{s.code}</span>
              <span className="chip__set-name">{s.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="filter-panel__section">
        <h4>特徴</h4>
        <input
          className="filter-subtype-input"
          placeholder="例: 麦わらの一味"
          value={filters.sub_types ?? ''}
          onChange={(e) =>
            onChange({ ...filters, sub_types: e.target.value || undefined, offset: 0 })
          }
        />
      </div>

      {hasFilters && (
        <button
          className="btn btn--ghost filter-reset-btn"
          onClick={() =>
            onChange({
              ...filters,
              color: [],
              category: [],
              cost: [],
              rarity: [],
              block: [],
              set_code: [],
              sub_types: undefined,
              offset: 0,
            })
          }
        >
          フィルタをリセット
        </button>
      )}
    </div>
  )
}
