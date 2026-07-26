import { Activity, TrendingUp, Signal } from 'lucide-react'
import type { MetricData } from './types'

const iconMap = {
  activity: Activity,
  trending: TrendingUp,
  signal: Signal,
}

const colorMap: Record<string, { bar: string; hex: string; iconBg: string; iconText: string }> = {
  red: { bar: 'bg-red-500', hex: '#dc2626', iconBg: 'bg-red-500/20', iconText: 'text-red-400' },
  green: { bar: 'bg-emerald-500', hex: '#10b981', iconBg: 'bg-emerald-500/20', iconText: 'text-emerald-400' },
  orange: { bar: 'bg-amber-500', hex: '#f59e0b', iconBg: 'bg-amber-500/20', iconText: 'text-amber-400' },
}

function MiniChart({ color }: { color: string }) {
  const c = colorMap[color]
  const bars = [35, 60, 45, 80, 55, 90, 70, 95, 75, 85]
  return (
    <div className="flex items-end gap-[2px]" aria-hidden="true">
      {bars.map((h, i) => (
        <div key={i} className={`${c.bar} rounded-sm`}
          style={{ height: `${h * 0.35}px`, opacity: 0.3 + (h / 100) * 0.5, transition: 'height 0.3s' }} />
      ))}
    </div>
  )
}

export default function MetricCard({ data }: { data: MetricData }) {
  const Icon = iconMap[data.icon]
  const c = colorMap[data.color]

  return (
    <div className="group rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md
      transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-white/20"
      style={{ boxShadow: '0 0 0 1px transparent' }}>
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.iconBg}`}
          style={{ boxShadow: `0 0 0 1px ${c.hex}20` }}>
          <Icon className={`h-4 w-4 ${c.iconText}`} aria-hidden="true" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">{data.value}</p>
      <p className="mt-0.5 text-[11px] text-gray-500">{data.label}</p>
      <div className="mt-3">
        <MiniChart color={data.color} />
      </div>
    </div>
  )
}
