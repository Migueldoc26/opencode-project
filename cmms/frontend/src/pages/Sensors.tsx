import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Thermometer, Gauge, Activity, Droplets, Zap, Wind,
  Search, Edit, Trash2, Plus, X, Bell, SlidersHorizontal, Wifi, Box, Server,
} from 'lucide-react'
import api, { sensorService, assetService } from '../services/api'
import { useTranslation } from '../context/TranslationContext'

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
  code?: string
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
  const navigate = useNavigate()
  const { t } = useTranslation()
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
  const [testSensor, setTestSensor] = useState<Sensor | null>(null)
  const [testValue, setTestValue] = useState('')
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

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
      setError(apiError?.error?.message || apiError?.message || t('common.error'))
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
      setError(t('common.error'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('sensors.delete-confirm'))) return
    try {
      await sensorService.remove(id)
      setSensors(prev => prev.filter(s => s.id !== id))
    } catch { /* ignore */ }
  }

  const openTestModal = (sensor: Sensor) => {
    setTestSensor(sensor)
    setTestValue(String(sensor.value ?? ''))
    setTestResult(null)
  }

  const handleTestMqtt = async () => {
    if (!testSensor) return
    const val = parseFloat(testValue)
    if (isNaN(val)) { setTestResult('Ingresa un valor numérico válido'); return }
    setTestSending(true)
    setTestResult(null)
    try {
      await handleSetManualValue(testSensor.code, val)
      const res = await sensorService.testMqtt({ sensorId: testSensor.id, value: val })
      setSensors(prev => prev.map(s => s.id === testSensor.id ? { ...s, value: val } : s))
      setTestResult('Enviado: ' + res.topic + ' = ' + val)
      setTimeout(() => { setTestSensor(null); setTestResult(null) }, 1500)
    } catch {
      setTestResult('Error enviando. Verifica que el broker esté conectado.')
    } finally {
      setTestSending(false)
    }
  }

  const handleSetManualValue = async (code: string, value: number) => {
    try {
      await api.post('/sensors/manual-value', { code, value }).then(r => r.data)
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('sensors.title')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('sensors.subtitle')}</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t('sensors.add')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('sensors.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <input
          type="text"
          placeholder={t('sensors.filter-asset')}
          value={filterAsset}
          onChange={e => setFilterAsset(e.target.value)}
          className="input-field w-44"
        />
        {(search || filterAsset) && (
          <button onClick={() => { setSearch(''); setFilterAsset('') }} className="btn-secondary flex items-center gap-2">
            <X className="h-4 w-4" />
            {t('common.clear')}
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
          <div className="col-span-full py-12 text-center text-sm text-gray-500">{t('sensors.none')}</div>
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
                <p className="text-xs text-gray-500">{sensorTypes.find(type => type.value === sensor.type)?.label || sensor.type} - {sensor.assetName || sensor.assetId}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">{sensor.value}</span>
                  <span className="text-sm text-gray-500">{sensor.unit}</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => openEdit(sensor)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600" title={t('common.edit')}>
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => openThresholdModal(sensor)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600" title={t('sensors.thresholds')}>
                    <SlidersHorizontal className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(sensor.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-danger-600" title={t('common.delete')}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => openTestModal(sensor)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-cyan-600" title="Test MQTT">
                    <Wifi className="h-4 w-4" />
                  </button>
                  {sensor.assetId && (
                    <button onClick={() => navigate(`/assets/${sensor.assetId}`)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600" title="Ver activo">
                      <Server className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => navigate('/digital-twin')} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600" title="Ubicar en gemelo digital">
                    <Box className="h-4 w-4" />
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
              <h3 className="text-lg font-semibold text-gray-900">{editSensor ? t('sensors.edit') : t('sensors.create')}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label">{t('sensors.name')} *</label>
                  <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">{t('sensors.type')}</label>
                  <select className="input-field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, unit: sensorTypes.find(t => t.value === e.target.value)?.unit || '' }))}>
                    {sensorTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">{t('sensors.unit')}</label>
                  <input className="input-field" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="e.g. °C, bar, RPM" />
                </div>
                <div>
                  <label className="label">{t('sensors.asset')} *</label>
                  <select className="input-field" value={form.assetId} onChange={e => setForm(f => ({ ...f, assetId: e.target.value }))} required>
                    <option value="">{t('sensors.select-asset')}</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">{t('sensors.mqtt-topic')}</label>
                  <input className="input-field" value={form.mqttTopic} onChange={e => setForm(f => ({ ...f, mqttTopic: e.target.value }))} placeholder="e.g. sensors/temperature-01" />
                </div>
                <div>
                  <label className="label">{t('sensors.sampling-rate')}</label>
                  <input type="number" className="input-field" value={form.samplingRate} onChange={e => setForm(f => ({ ...f, samplingRate: e.target.value }))} placeholder="e.g. 1000" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" className="h-4 w-4 rounded border-gray-300 text-primary-600" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                  <label htmlFor="isActive" className="label mb-0">{t('sensors.active')}</label>
                </div>
              </div>

              <hr className="border-gray-200" />
              <p className="text-sm font-medium text-gray-700">{t('sensors.thresholds')}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">{t('sensors.min-threshold')}</label>
                  <input type="number" className="input-field" value={form.minThreshold} onChange={e => setForm(f => ({ ...f, minThreshold: e.target.value }))} placeholder="Minimum safe value" />
                </div>
                <div>
                  <label className="label">{t('sensors.max-threshold')}</label>
                  <input type="number" className="input-field" value={form.maxThreshold} onChange={e => setForm(f => ({ ...f, maxThreshold: e.target.value }))} placeholder="Maximum safe value" />
                </div>
                <div>
                  <label className="label">{t('sensors.warning-min')}</label>
                  <input type="number" className="input-field" value={form.warningMin} onChange={e => setForm(f => ({ ...f, warningMin: e.target.value }))} />
                </div>
                <div>
                  <label className="label">{t('sensors.warning-max')}</label>
                  <input type="number" className="input-field" value={form.warningMax} onChange={e => setForm(f => ({ ...f, warningMax: e.target.value }))} />
                </div>
                <div>
                  <label className="label">{t('sensors.critical-min')}</label>
                  <input type="number" className="input-field" value={form.criticalMin} onChange={e => setForm(f => ({ ...f, criticalMin: e.target.value }))} />
                </div>
                <div>
                  <label className="label">{t('sensors.critical-max')}</label>
                  <input type="number" className="input-field" value={form.criticalMax} onChange={e => setForm(f => ({ ...f, criticalMax: e.target.value }))} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowModal(false)} className="btn-secondary">{t('common.cancel')}</button>
                <button onClick={handleSubmit} className="btn-primary">{editSensor ? t('common.update') : t('common.create')}</button>
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
              <h3 className="text-lg font-semibold text-gray-900">{t('sensors.thresholds')}</h3>
              <button onClick={() => setShowThresholdModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}
            <p className="mb-4 text-sm text-gray-500">{editSensor.name} ({editSensor.type})</p>
            <div className="space-y-4">
              <div>
                <label className="label">{t('sensors.min-threshold')}</label>
                <input
                  type="number"
                  className="input-field"
                  value={thresholdForm.minThreshold}
                  onChange={e => setThresholdForm(f => ({ ...f, minThreshold: e.target.value }))}
                  placeholder="Leave empty for no minimum"
                />
              </div>
              <div>
                <label className="label">{t('sensors.max-threshold')}</label>
                <input
                  type="number"
                  className="input-field"
                  value={thresholdForm.maxThreshold}
                  onChange={e => setThresholdForm(f => ({ ...f, maxThreshold: e.target.value }))}
                  placeholder="Leave empty for no maximum"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowThresholdModal(false)} className="btn-secondary">{t('common.cancel')}</button>
                <button onClick={handleThresholdSave} className="btn-primary">{t('common.save')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test MQTT Modal */}
      {testSensor && (
        <div className="modal-overlay" onClick={() => { setTestSensor(null); setTestResult(null) }}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Probar Sensor</h3>
              <button onClick={() => { setTestSensor(null); setTestResult(null) }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-500">
              {testSensor.name} <span className="text-gray-400">({testSensor.type})</span>
            </p>
            <p className="mb-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{testSensor.value}</span>
              <span className="text-sm text-gray-500">{testSensor.unit}</span>
              <span className="ml-auto text-xs text-gray-400">Valor actual</span>
            </p>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="label">Valor de prueba</label>
                  <button onClick={() => setTestValue(String(testSensor?.value ?? ''))} className="text-xs text-gray-400 hover:text-primary-600">
                    Reset
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  className="input-field text-lg font-bold"
                  value={testValue}
                  onChange={e => setTestValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !testSending && handleTestMqtt()}
                  placeholder="Ingresa un valor..."
                  autoFocus
                />
              </div>
              {testResult && (
                <div className={`rounded-lg p-3 text-sm ${testResult.startsWith('Error') ? 'bg-danger-50 text-danger-700' : testResult.startsWith('Enviado') ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'}`}>
                  {testResult}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button onClick={() => { setTestSensor(null); setTestResult(null) }} className="btn-secondary">Cancelar</button>
                <button onClick={handleTestMqtt} disabled={testSending} className="btn-primary flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  {testSending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
