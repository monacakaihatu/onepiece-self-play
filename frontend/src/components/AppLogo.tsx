export function AppLogo({ size = 26 }: { size?: number }) {
  const c = size / 2
  const outerR = size * 0.42
  const hubR = size * 0.16
  const spokeIn = size * 0.21
  const spokeOut = size * 0.38
  const sw = size * 0.055

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden>
      <circle cx={c} cy={c} r={outerR} stroke="#f5c842" strokeWidth={sw} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * 45 * Math.PI) / 180
        return (
          <line
            key={i}
            x1={c + spokeIn * Math.cos(a)}
            y1={c + spokeIn * Math.sin(a)}
            x2={c + spokeOut * Math.cos(a)}
            y2={c + spokeOut * Math.sin(a)}
            stroke="#f5c842"
            strokeWidth={sw * 1.1}
            strokeLinecap="round"
          />
        )
      })}
      <circle cx={c} cy={c} r={hubR} fill="#f5c842" />
    </svg>
  )
}
