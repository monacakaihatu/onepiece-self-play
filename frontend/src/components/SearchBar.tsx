import { useState, useCallback } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'カード名・番号で検索...' }: Props) {
  const [local, setLocal] = useState(value)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocal(e.target.value)
      onChange(e.target.value)
    },
    [onChange],
  )

  return (
    <input
      type="search"
      className="search-bar"
      value={local}
      onChange={handleChange}
      placeholder={placeholder}
    />
  )
}
