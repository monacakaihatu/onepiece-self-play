import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { DeckList } from './pages/DeckList'
import { DeckBuilder } from './pages/DeckBuilder'
import { CardBrowser } from './pages/CardBrowser'
import { Solitaire } from './pages/Solitaire'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/decks" element={<DeckList />} />
        <Route path="/cards" element={<CardBrowser />} />
        <Route path="/deck/:id" element={<DeckBuilder />} />
        <Route path="/solitaire/:id" element={<Solitaire />} />
      </Routes>
    </BrowserRouter>
  )
}
