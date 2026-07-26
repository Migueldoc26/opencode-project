import TechnologyLogo from './TechnologyLogo'
import TechnologyNetwork from './TechnologyNetwork'
import MetricCard from './MetricCard'
import type { MetricData } from './types'

const metrics: MetricData[] = [
  { id: '1', icon: 'activity', value: '156', label: 'Activos monitoreados', color: 'red' },
  { id: '2', icon: 'trending', value: '98%', label: 'Disponibilidad', color: 'green' },
  { id: '3', icon: 'signal', value: '24/7', label: 'Monitoreo en vivo', color: 'orange' },
]

export default function BrandingPanel() {
  return (
    <div className="relative hidden w-[60%] flex-col justify-between overflow-hidden lg:flex"
      style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #0f172a 40%, #1e1b2e 100%)' }}>
      <div className="absolute inset-0 opacity-[0.15]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
      <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-red-600/5 blur-[120px]" />
      <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-blue-600/5 blur-[100px]" />

      <TechnologyNetwork />

      <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">
        <div>
          <div className="flex items-center gap-3">
            <TechnologyLogo size={48} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">CMMS Vision</h1>
              <p className="text-sm text-gray-400">Industrial Maintenance</p>
            </div>
          </div>

          <div className="mt-20 xl:mt-28 space-y-5">
            <div>
              <p className="text-4xl xl:text-5xl font-bold tracking-tight text-white">Mantenimiento</p>
              <p className="text-4xl xl:text-5xl font-bold tracking-tight text-red-500">Predictivo e Industrial</p>
            </div>
            <p className="max-w-lg text-base leading-relaxed text-gray-400">
              Monitorea tus activos en tiempo real, programa mantenimientos y reduce tiempos de
              inactividad con nuestra plataforma integral.
            </p>
          </div>
        </div>

        <div className="mt-auto pt-16">
          <div className="grid grid-cols-3 gap-4 xl:gap-5">
            {metrics.map(m => <MetricCard key={m.id} data={m} />)}
          </div>

          <p className="mt-8 text-xs text-gray-600">
            CMMS Vision v2.0.0 &copy; 2026 &mdash; Plataforma de mantenimiento industrial
          </p>
        </div>
      </div>
    </div>
  )
}
