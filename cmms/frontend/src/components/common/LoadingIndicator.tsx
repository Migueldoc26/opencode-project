import { ThinkingOrb } from 'thinking-orbs'
import type { OrbState } from 'thinking-orbs'
import type { CSSProperties } from 'react'

interface LoadingIndicatorProps {
  size?: 20 | 64
  state?: OrbState
  label?: string
  className?: string
  style?: CSSProperties
  prominent?: boolean
}

export default function LoadingIndicator({ size = 64, state = 'working', label, className = '', style, prominent = false }: LoadingIndicatorProps) {
  if (prominent) {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/95 p-8 shadow-xl ring-1 ring-gray-200 ${className}`} style={style}>
        <div className="scale-[1.5]">
          <ThinkingOrb state={state} size={size} />
        </div>
        {label ? <p className="text-base font-medium text-gray-700">{label}</p> : null}
      </div>
    )
  }
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} style={style}>
      <ThinkingOrb state={state} size={size} />
      {label ? <p className="text-sm text-gray-500">{label}</p> : null}
    </div>
  )
}
