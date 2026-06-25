import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DeckList } from './pages/DeckList'
import { DeckBuilder } from './pages/DeckBuilder'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DeckList />} />
        <Route path="/deck/:id" element={<DeckBuilder />} />
      </Routes>
    </BrowserRouter>
  )
}
