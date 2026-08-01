import { ThinkingOrb } from 'thinking-orbs'
import type { OrbState } from 'thinking-orbs'
import type { CSSProperties } from 'react'

interface LoadingIndicatorProps {
  size?: 20 | 64
  state?: OrbState
  label?: string
  className?: string
  style?: CSSProperties
}

export default function LoadingIndicator({ size = 64, state = 'working', label, className = '', style }: LoadingIndicatorProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} style={style}>
      <ThinkingOrb state={state} size={size} />
      {label ? <p className="text-sm text-gray-500">{label}</p> : null}
    </div>
  )
}
