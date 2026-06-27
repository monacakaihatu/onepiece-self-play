import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLogo } from './AppLogo'

interface AppHeaderProps {
  back?: { to: string; label?: string } | (() => void)
  title?: string
  right?: React.ReactNode
}

export function AppHeader({ back, title, right }: AppHeaderProps) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleBack = () => {
    if (!back) return
    if (typeof back === 'function') back()
    else navigate(back.to)
  }

  const backLabel = typeof back === 'object' ? (back.label ?? '戻る') : '戻る'

  return (
    <header className="app-header">
      <Link to="/" className="app-header__brand">
        <AppLogo size={26} />
        <span className="app-header__brand-name">VIVRE</span>
      </Link>

      {title && <h1 className="app-header__title">{title}</h1>}

      <div className="app-header__right">
        {right}
        <div className="app-header__menu-wrap" ref={menuRef}>
          <button
            className={`hamburger-btn${menuOpen ? ' hamburger-btn--open' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="メニュー"
          >
            <span />
            <span />
            <span />
          </button>
          {menuOpen && (
            <nav className="app-nav-dropdown" onClick={() => setMenuOpen(false)}>
              <Link to="/" className="app-nav-dropdown__item">🏠 ホーム</Link>
              <Link to="/decks" className="app-nav-dropdown__item">🃏 デッキ一覧</Link>
              <Link to="/cards" className="app-nav-dropdown__item">🔍 カード一覧</Link>
              <Link to="/simulate" className="app-nav-dropdown__item">⚔️ 一人回し</Link>
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}
