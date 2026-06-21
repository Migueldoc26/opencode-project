import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Server, Activity, Thermometer, Gauge, Droplets,
  Wrench, Clock, FileText, AlertTriangle, Cpu,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { assetService } from '../services/api'

const readingHistory = [
  { time: '00:00', temperature: 72, pressure: 4.1, vibration: 1.2 },
  { time: '04:00', temperature: 73, pressure: 4.2, vibration: 1.3 },
  { time: '08:00', temperature: 75, pressure: 4.3, vibration: 1.5 },
  { time: '12:00', temperature: 74, pressure: 4.2, vibration: 1.4 },
  { time: '16:00', temperature: 72, pressure: 4.0, vibration: 1.1 },
  { time: '20:00', temperature: 71, pressure: 4.1, vibration: 1.0 },
]

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [asset, setAsset] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'sensors' | 'maintenance' | 'documents'>('info')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    assetService.getById(id)
      .then(setAsset)
      .catch(() => navigate('/assets'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (!asset) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/assets')} className="btn-secondary px-3 py-2">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{asset.name as string}</h2>
          <p className="text-sm text-gray-500">{asset.type as string} - Serial: {asset.serialNumber as string || 'N/A'}</p>
        </div>
        <span className={`badge ${
          asset.status === 'OPERATIONAL' ? 'badge-success' :
          asset.status === 'MAINTENANCE' ? 'badge-warning' :
          asset.status === 'BREAKDOWN' ? 'badge-danger' : 'badge-gray'
        }`}>{asset.status as string}</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {(['info', 'sensors', 'maintenance', 'documents'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'tab-active' : 'tab'}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card space-y-4">
            <h3 className="card-title">General Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Manufacturer', asset.manufacturer as string],
                ['Model', asset.model as string],
                ['Location', asset.location as string],
                ['Area', asset.area as string],
                ['Install Date', asset.installDate as string],
                ['Plant ID', asset.plantId as string],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-gray-500">{label}</p>
                  <p className="font-medium text-gray-900">{value || '-'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title mb-4">Current Readings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Thermometer className="h-8 w-8 text-danger-500" />
                <div>
                  <p className="text-xs text-gray-500">Temperature</p>
                  <p className="text-lg font-bold text-gray-900">74.2°C</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Gauge className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-xs text-gray-500">Pressure</p>
                  <p className="text-lg font-bold text-gray-900">4.2 bar</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Activity className="h-8 w-8 text-warning-500" />
                <div>
                  <p className="text-xs text-gray-500">Vibration</p>
                  <p className="text-lg font-bold text-gray-900">1.4 mm/s</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Droplets className="h-8 w-8 text-cyan-500" />
                <div>
                  <p className="text-xs text-gray-500">Flow Rate</p>
                  <p className="text-lg font-bold text-gray-900">142 L/min</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sensors Tab */}
      {activeTab === 'sensors' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Sensors</h3>
              <Activity className="h-4 w-4 text-gray-400" />
            </div>
            <div className="space-y-3">
              {[
                { name: 'Temperature Sensor', type: 'Temperature', value: '74.2°C', status: 'normal' },
                { name: 'Pressure Gauge', type: 'Pressure', value: '4.2 bar', status: 'normal' },
                { name: 'Vibration Monitor', type: 'Vibration', value: '1.4 mm/s', status: 'warning' },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      s.status === 'critical' ? 'bg-danger-500' :
                      s.status === 'warning' ? 'bg-warning-500' : 'bg-success-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.type}</p>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-medium text-gray-900">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Historical Readings</h3>
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={readingHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="temperature" stroke="#dc2626" strokeWidth={2} name="Temperature (°C)" />
                  <Line type="monotone" dataKey="pressure" stroke="#3b82f6" strokeWidth={2} name="Pressure (bar)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Maintenance Log</h3>
            <Wrench className="h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-4">
            {[
              { date: '2024-06-15', type: 'Preventive', description: 'Lubrication and belt replacement', technician: 'John D.', status: 'completed' },
              { date: '2024-05-20', type: 'Corrective', description: 'Bearing replacement due to vibration', technician: 'Sarah M.', status: 'completed' },
              { date: '2024-05-01', type: 'Inspection', description: 'Monthly inspection', technician: 'Mike R.', status: 'completed' },
            ].map((m, i) => (
              <div key={i} className="flex items-start gap-4 rounded-lg border p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                  <Wrench className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{m.type}</p>
                      <p className="text-sm text-gray-600">{m.description}</p>
                    </div>
                    <span className="badge-success">{m.status}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{m.date}</span>
                    <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{m.technician}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Documents</h3>
            <FileText className="h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-3">
            {[
              { name: 'Technical Manual.pdf', type: 'PDF', size: '2.4 MB', date: '2024-01-15' },
              { name: 'Wiring Diagram.dwg', type: 'CAD', size: '5.1 MB', date: '2024-01-15' },
              { name: 'Maintenance Schedule.xlsx', type: 'Excel', size: '156 KB', date: '2024-02-01' },
            ].map((doc, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-500">{doc.type} - {doc.size} - {doc.date}</p>
                  </div>
                </div>
                <button className="btn-secondary px-3 py-1.5 text-xs">Download</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
