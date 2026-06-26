import { useNavigate } from 'react-router-dom'

const FEATURES = [
  {
    to: '/decks',
    title: 'デッキ一覧',
    subtitle: 'Deck Manager',
    desc: 'デッキを作成・編集する',
    icon: '🃏',
    accent: '#f5c842',
  },
  {
    to: '/cards',
    title: 'カード一覧',
    subtitle: 'Card Browser',
    desc: '全カードを検索・閲覧する',
    icon: '🔍',
    accent: '#4a90e2',
  },
  {
    to: '/decks',
    title: '一人回し',
    subtitle: 'Solo Simulator',
    desc: 'デッキを選んでシミュレート',
    icon: '⚔️',
    accent: '#e05353',
  },
]

export function Home() {
  const navigate = useNavigate()

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header__logo">ONE PIECE TCG</div>
        <div className="home-header__sub">デッキ管理 &amp; 一人回しツール</div>
      </header>

      <div className="home-features">
        {FEATURES.map((f) => (
          <button
            key={f.title}
            className="home-feature-card"
            style={{ '--card-accent': f.accent } as React.CSSProperties}
            onClick={() => navigate(f.to)}
          >
            <span className="home-feature-card__icon">{f.icon}</span>
            <span className="home-feature-card__title">{f.title}</span>
            <span className="home-feature-card__subtitle">{f.subtitle}</span>
            <span className="home-feature-card__desc">{f.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
