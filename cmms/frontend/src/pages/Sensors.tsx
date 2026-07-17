import { useState, useEffect } from 'react'
import {
  Thermometer, Gauge, Activity, Droplets, Zap, Wind,
  Search, Edit, Trash2, Plus, X, Bell, SlidersHorizontal,
} from 'lucide-react'
import { sensorService, assetService } from '../services/api'

interface SensorType {
  value: string
  label: string
  unit: string
  icon: string
}

interface Asset {
  id: string
  name: string
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
  mqttTopic?: string
  minThreshold?: number
  maxThreshold?: number
  warningMin?: number
  warningMax?: number
  criticalMin?: number
  criticalMax?: number
  isActive?: boolean
  samplingRate?: number
  position?: { x: number; y: number; z: number }
}

const typeIcons: Record<string, typeof Thermometer> = {
  TEMPERATURE: Thermometer,
  VIBRATION: Activity,
  PRESSURE: Gauge,
  FLOW: Droplets,
  LEVEL: Droplets,
  ENERGY_CONSUMPTION: Zap,
  OPERATIONAL_STATUS: Thermometer,
  HUMIDITY: Droplets,
  SPEED: Activity,
  CURRENT: Zap,
  VOLTAGE: Zap,
  GAS: Wind,
}

interface SensorForm {
  name: string
  type: string
  unit: string
  mqttTopic: string
  assetId: string
  minThreshold: string
  maxThreshold: string
  warningMin: string
  warningMax: string
  criticalMin: string
  criticalMax: string
  isActive: boolean
  samplingRate: string
}

const emptyForm: SensorForm = {
  name: '', type: 'TEMPERATURE', unit: '', mqttTopic: '', assetId: '',
  minThreshold: '', maxThreshold: '', warningMin: '', warningMax: '',
  criticalMin: '', criticalMax: '', isActive: true, samplingRate: '',
}

export default function Sensors() {
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAsset, setFilterAsset] = useState('')
  const [sensorTypes, setSensorTypes] = useState<SensorType[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editSensor, setEditSensor] = useState<Sensor | null>(null)
  const [form, setForm] = useState<SensorForm>(emptyForm)
  const [showThresholdModal, setShowThresholdModal] = useState(false)
  const [thresholdForm, setThresholdForm] = useState({ minThreshold: '', maxThreshold: '' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      sensorService.list(),
      sensorService.getAvailableTypes(),
      assetService.list({ limit: 200 }),
    ])
      .then(([sensorData, typesData, assetData]) => {
        setSensors(sensorData.items || sensorData.data || [])
        setSensorTypes(typesData.data || [])
        setAssets(assetData.items || assetData.data || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filteredSensors = sensors.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.type.toLowerCase().includes(search.toLowerCase())
    const matchAsset = !filterAsset || s.assetId === filterAsset
    return matchSearch && matchAsset
  })

  const openCreate = () => {
    setEditSensor(null)
    setForm(emptyForm)
    setError(null)
    setShowModal(true)
  }

  const openEdit = (sensor: Sensor) => {
    setEditSensor(sensor)
    setForm({
      name: sensor.name,
      type: sensor.type,
      unit: sensor.unit || '',
      mqttTopic: sensor.mqttTopic || '',
      assetId: sensor.assetId,
      minThreshold: sensor.minThreshold?.toString() || '',
      maxThreshold: sensor.maxThreshold?.toString() || '',
      warningMin: sensor.warningMin?.toString() || '',
      warningMax: sensor.warningMax?.toString() || '',
      criticalMin: sensor.criticalMin?.toString() || '',
      criticalMax: sensor.criticalMax?.toString() || '',
      isActive: sensor.isActive ?? true,
      samplingRate: sensor.samplingRate?.toString() || '',
    })
    setError(null)
    setShowModal(true)
  }

  const handleSubmit = async () => {
    setError(null)
    const payload: Record<string, unknown> = {
      name: form.name,
      type: form.type,
      unit: form.unit || null,
      mqttTopic: form.mqttTopic || null,
      assetId: form.assetId,
      isActive: form.isActive,
      minThreshold: form.minThreshold ? parseFloat(form.minThreshold) : null,
      maxThreshold: form.maxThreshold ? parseFloat(form.maxThreshold) : null,
      warningMin: form.warningMin ? parseFloat(form.warningMin) : null,
      warningMax: form.warningMax ? parseFloat(form.warningMax) : null,
      criticalMin: form.criticalMin ? parseFloat(form.criticalMin) : null,
      criticalMax: form.criticalMax ? parseFloat(form.criticalMax) : null,
      samplingRate: form.samplingRate ? parseInt(form.samplingRate) : null,
    }
    try {
      if (editSensor) {
        await sensorService.update(editSensor.id, payload)
      } else {
        await sensorService.create(payload)
      }
      setShowModal(false)
      const data = await sensorService.list()
      setSensors(data.items || data.data || [])
    } catch (err: unknown) {
      const apiError = (err as any)?.response?.data
      setError(apiError?.error?.message || apiError?.message || 'Operation failed')
    }
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sensors</h2>
          <p className="mt-1 text-sm text-gray-500">Monitor real-time sensor data across assets</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Sensor
        </button>
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
                <p className="text-xs text-gray-500">{sensorTypes.find(t => t.value === sensor.type)?.label || sensor.type} on {sensor.assetName || sensor.assetId}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">{sensor.value}</span>
                  <span className="text-sm text-gray-500">{sensor.unit}</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => openEdit(sensor)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600" title="Edit sensor">
                    <Edit className="h-4 w-4" />
                  </button>
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{editSensor ? 'Edit Sensor' : 'Create Sensor'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label">Name *</label>
                  <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input-field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, unit: sensorTypes.find(t => t.value === e.target.value)?.unit || '' }))}>
                    {sensorTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Unit</label>
                  <input className="input-field" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="e.g. °C, bar, RPM" />
                </div>
                <div>
                  <label className="label">Asset *</label>
                  <select className="input-field" value={form.assetId} onChange={e => setForm(f => ({ ...f, assetId: e.target.value }))} required>
                    <option value="">Select asset</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">MQTT Topic</label>
                  <input className="input-field" value={form.mqttTopic} onChange={e => setForm(f => ({ ...f, mqttTopic: e.target.value }))} placeholder="e.g. sensors/temperature-01" />
                </div>
                <div>
                  <label className="label">Sampling Rate (ms)</label>
                  <input type="number" className="input-field" value={form.samplingRate} onChange={e => setForm(f => ({ ...f, samplingRate: e.target.value }))} placeholder="e.g. 1000" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" className="h-4 w-4 rounded border-gray-300 text-primary-600" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                  <label htmlFor="isActive" className="label mb-0">Active</label>
                </div>
              </div>

              <hr className="border-gray-200" />
              <p className="text-sm font-medium text-gray-700">Thresholds</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Min Threshold</label>
                  <input type="number" className="input-field" value={form.minThreshold} onChange={e => setForm(f => ({ ...f, minThreshold: e.target.value }))} placeholder="Minimum safe value" />
                </div>
                <div>
                  <label className="label">Max Threshold</label>
                  <input type="number" className="input-field" value={form.maxThreshold} onChange={e => setForm(f => ({ ...f, maxThreshold: e.target.value }))} placeholder="Maximum safe value" />
                </div>
                <div>
                  <label className="label">Warning Min</label>
                  <input type="number" className="input-field" value={form.warningMin} onChange={e => setForm(f => ({ ...f, warningMin: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Warning Max</label>
                  <input type="number" className="input-field" value={form.warningMax} onChange={e => setForm(f => ({ ...f, warningMax: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Critical Min</label>
                  <input type="number" className="input-field" value={form.criticalMin} onChange={e => setForm(f => ({ ...f, criticalMin: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Critical Max</label>
                  <input type="number" className="input-field" value={form.criticalMax} onChange={e => setForm(f => ({ ...f, criticalMax: e.target.value }))} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleSubmit} className="btn-primary">{editSensor ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
