import { useState, useEffect } from 'react'
import {
  Thermometer, Gauge, Activity, Droplets, Zap, Wind,
  Search, Edit, Trash2, Filter, X, Bell, SlidersHorizontal,
} from 'lucide-react'
import { sensorService } from '../services/api'

const typeIcons: Record<string, typeof Thermometer> = {
  Temperature: Thermometer,
  Pressure: Gauge,
  Vibration: Activity,
  Flow: Droplets,
  Electrical: Zap,
  Gas: Wind,
}

interface Sensor {
  id: string
  name: string
  type: string
  unit: string
  value: number
  status: string
  assetId: string
  assetName: string
  minThreshold?: number
  maxThreshold?: number
  position?: { x: number; y: number; z: number }
}

export default function Sensors() {
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAsset, setFilterAsset] = useState('')
  const [editSensor, setEditSensor] = useState<Sensor | null>(null)
  const [showThresholdModal, setShowThresholdModal] = useState(false)
  const [thresholdForm, setThresholdForm] = useState({ minThreshold: '', maxThreshold: '' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    sensorService.list()
      .then(data => setSensors(data.items || data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filteredSensors = sensors.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.type.toLowerCase().includes(search.toLowerCase())
    const matchAsset = !filterAsset || s.assetId === filterAsset
    return matchSearch && matchAsset
  })

  const openThresholdModal = (sensor: Sensor) => {
    setEditSensor(sensor)
    setThresholdForm({
      minThreshold: sensor.minThreshold?.toString() || '',
      maxThreshold: sensor.maxThreshold?.toString() || '',
    })
    setShowThresholdModal(true)
  }

  const handleThresholdSave = async () => {
    if (!editSensor) return
    setError(null)
    try {
      await sensorService.update(editSensor.id, {
        minThreshold: thresholdForm.minThreshold ? parseFloat(thresholdForm.minThreshold) : null,
        maxThreshold: thresholdForm.maxThreshold ? parseFloat(thresholdForm.maxThreshold) : null,
      })
      setShowThresholdModal(false)
      setSensors(prev => prev.map(s => s.id === editSensor.id ? {
        ...s,
        minThreshold: thresholdForm.minThreshold ? parseFloat(thresholdForm.minThreshold) : undefined,
        maxThreshold: thresholdForm.maxThreshold ? parseFloat(thresholdForm.maxThreshold) : undefined,
      } : s))
    } catch {
      setError('Failed to update thresholds')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sensor?')) return
    try {
      await sensorService.remove(id)
      setSensors(prev => prev.filter(s => s.id !== id))
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Sensors</h2>
        <p className="mt-1 text-sm text-gray-500">Monitor real-time sensor data across assets</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search sensors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <input
          type="text"
          placeholder="Filter by asset ID"
          value={filterAsset}
          onChange={e => setFilterAsset(e.target.value)}
          className="input-field w-44"
        />
        {(search || filterAsset) && (
          <button onClick={() => { setSearch(''); setFilterAsset('') }} className="btn-secondary flex items-center gap-2">
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      {/* Sensor Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : filteredSensors.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-gray-500">No sensors found</div>
        ) : (
          filteredSensors.map(sensor => {
            const IconComponent = typeIcons[sensor.type] || Activity
            const isOutOfRange = (sensor.minThreshold !== undefined && sensor.value < sensor.minThreshold) ||
              (sensor.maxThreshold !== undefined && sensor.value > sensor.maxThreshold)

            return (
              <div key={sensor.id} className={`card relative ${isOutOfRange ? 'ring-2 ring-danger-500' : ''}`}>
                {isOutOfRange && (
                  <div className="absolute -right-2 -top-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-danger-500 text-white">
                      <Bell className="h-3 w-3" />
                    </div>
                  </div>
                )}
                <div className="mb-3 flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    sensor.status === 'critical' ? 'bg-danger-100 text-danger-600' :
                    sensor.status === 'warning' ? 'bg-warning-100 text-warning-600' :
                    'bg-success-100 text-success-600'
                  }`}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    sensor.status === 'critical' ? 'bg-danger-500 animate-pulse' :
                    sensor.status === 'warning' ? 'bg-warning-500' :
                    'bg-success-500'
                  }`} />
                </div>
                <h3 className="text-sm font-medium text-gray-900">{sensor.name}</h3>
                <p className="text-xs text-gray-500">{sensor.type} on {sensor.assetName || sensor.assetId}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">{sensor.value}</span>
                  <span className="text-sm text-gray-500">{sensor.unit}</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => openThresholdModal(sensor)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600" title="Set thresholds">
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(sensor.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-danger-600" title="Delete sensor">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Threshold Modal */}
      {showThresholdModal && editSensor && (
        <div className="modal-overlay" onClick={() => setShowThresholdModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Set Thresholds</h3>
              <button onClick={() => setShowThresholdModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}
            <p className="mb-4 text-sm text-gray-500">{editSensor.name} ({editSensor.type})</p>
            <div className="space-y-4">
              <div>
                <label className="label">Min Threshold</label>
                <input
                  type="number"
                  className="input-field"
                  value={thresholdForm.minThreshold}
                  onChange={e => setThresholdForm(f => ({ ...f, minThreshold: e.target.value }))}
                  placeholder="Leave empty for no minimum"
                />
              </div>
              <div>
                <label className="label">Max Threshold</label>
                <input
                  type="number"
                  className="input-field"
                  value={thresholdForm.maxThreshold}
                  onChange={e => setThresholdForm(f => ({ ...f, maxThreshold: e.target.value }))}
                  placeholder="Leave empty for no maximum"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowThresholdModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleThresholdSave} className="btn-primary">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
