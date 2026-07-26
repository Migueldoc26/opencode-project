export default function TechnologyLogo({ size = 48 }: { size?: number }) {
  const s = size
  const half = s / 2
  const hexPoints = [
    [half, 0], [s * 0.933, s * 0.25], [s * 0.933, s * 0.75],
    [half, s], [s * 0.067, s * 0.75], [s * 0.067, s * 0.25],
  ].map(([x, y]) => `${x},${y}`).join(' ')

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg"
      aria-label="CMMS Vision logo" role="img" className="drop-shadow-glow shrink-0">
      <polygon points={hexPoints} fill="#0f172a" stroke="#dc2626" strokeWidth={s * 0.025} />
      <polygon points={hexPoints} fill="none" stroke="#475569" strokeWidth={s * 0.008}
        transform={`scale(0.85) translate(${s * 0.075}, ${s * 0.075})`} />
      <circle cx={half * 0.85} cy={half * 0.75} r={s * 0.08} fill="#dc2626" opacity={0.9} />
      <circle cx={half * 0.85} cy={half * 0.75} r={s * 0.03} fill="white" />
      <path d={`M ${half * 0.55} ${half * 1.05} L ${half * 0.45} ${half * 0.85} L ${half * 0.75} ${half * 0.95} Z`} fill="#94a3b8" />
      <line x1={half * 0.85} y1={half * 0.75} x2={s * 0.7} y2={half * 0.35} stroke="#dc2626" strokeWidth={s * 0.015} />
      <circle cx={s * 0.7} cy={half * 0.35} r={s * 0.04} fill="#dc2626" />
      <line x1={half * 0.9} y1={half * 0.5} x2={s * 0.75} y2={half * 0.6} stroke="#60a5fa" strokeWidth={s * 0.01} strokeDasharray={`${s * 0.04} ${s * 0.03}`} />
      <line x1={s * 0.7} y1={half * 0.35} x2={s * 0.82} y2={half * 0.18} stroke="#60a5fa" strokeWidth={s * 0.01} strokeDasharray={`${s * 0.03} ${s * 0.03}`} />
      <path d={`M ${s * 0.8} ${half * 0.15} Q ${s * 0.85} ${half * 0.1} ${s * 0.9} ${half * 0.18}`} stroke="#10b981" strokeWidth={s * 0.012} fill="none" />
      <path d={`M ${s * 0.85} ${half * 0.12} Q ${s * 0.9} ${half * 0.07} ${s * 0.95} ${half * 0.15}`} stroke="#10b981" strokeWidth={s * 0.012} fill="none" />
      <path d={`M ${s * 0.9} ${half * 0.08} Q ${s * 0.95} ${half * 0.03} ${s} ${half * 0.12}`} stroke="#10b981" strokeWidth={s * 0.012} fill="none" />
      <circle cx={s * 0.82} cy={half * 0.3} r={s * 0.025} fill="#f59e0b" opacity={0.7} />
      <circle cx={s * 0.88} cy={half * 0.25} r={s * 0.015} fill="#f59e0b" opacity={0.5} />
    </svg>
  )
}
