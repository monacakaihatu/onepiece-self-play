import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Home } from './pages/Home'
import { DeckList } from './pages/DeckList'
import { DeckBuilder } from './pages/DeckBuilder'
import { CardBrowser } from './pages/CardBrowser'
import { Simulator } from './pages/Simulator'
import { Solitaire } from './pages/Solitaire'
import { SimulatorSetup } from './pages/SimulatorSetup'
import { SimulatorDuel } from './pages/SimulatorDuel'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/decks" element={<DeckList />} />
        <Route path="/cards" element={<CardBrowser />} />
        <Route path="/deck/:id" element={<DeckBuilder />} />
        {/* 2-player setup + duel */}
        <Route path="/simulate" element={<SimulatorSetup />} />
        <Route path="/duel/:firstId/:secondId" element={<SimulatorDuel />} />
        {/* Legacy single-deck routes */}
        <Route path="/simulate/:deckId" element={<Simulator />} />
        <Route path="/solitaire/:id" element={<Solitaire />} />
      </Routes>
    </BrowserRouter>
  )
}
