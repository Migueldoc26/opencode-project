import { useState, useEffect, useRef, useCallback } from 'react'
import { Wifi, WifiOff, Send, Trash2, Radio, Activity, Thermometer, Droplets, Wind, Ruler, CheckCircle2, XCircle } from 'lucide-react'
import { useWebSocket } from '../context/WebSocketContext'
import api, { sensorService } from '../services/api'

interface MqttMessage {
  id: number
  topic: string
  payload: string
  receivedAt: string
}

interface SensorInfo {
  id: string
  code: string
  name: string
  lastValue: number | null
  unit: string
  type: string
}

export default function MqttInspector() {
  const { connected, subscribe, unsubscribe } = useWebSocket()
  const [messages, setMessages] = useState<MqttMessage[]>([])
  const [topic, setTopic] = useState('controlmc/esp32/esp32_01/sensores')
  const [payload, setPayload] = useState('{"temperature_c":25.0,"humidity_percent":50,"gas_raw":1000,"distance_cm":20,"device_id":"esp32_01"}')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)
  const autoScroll = useRef(true)
  const idRef = useRef(0)
  const [sensors, setSensors] = useState<SensorInfo[]>([])
  const [sensorsLoading, setSensorsLoading] = useState(true)
  const [manualValues, setManualValues] = useState<Record<string, string>>({})
  const [settingValue, setSettingValue] = useState<string | null>(null)
  const [manualStatus, setManualStatus] = useState<{ code: string; ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    const handler = (data: unknown) => {
      const msg = data as { topic: string; payload: unknown; receivedAt: string }
      idRef.current++
      setMessages(prev => {
        const next = [...prev, {
          id: idRef.current,
          topic: msg.topic,
          payload: typeof msg.payload === 'string' ? msg.payload : JSON.stringify(msg.payload, null, 2),
          receivedAt: msg.receivedAt,
        }]
        return next.slice(-200)
      })
    }
    subscribe('mqtt:raw', handler)
    return () => unsubscribe('mqtt:raw')
  }, [subscribe, unsubscribe])

  useEffect(() => {
    if (autoScroll.current && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [messages])

  const loadSensors = useCallback(async () => {
    setSensorsLoading(true)
    try {
      const res = await sensorService.list()
      const list = res.data || []
      setSensors(list.map((s: any) => ({ id: s.id, code: s.code, name: s.name, lastValue: s.lastValue, unit: s.unit, type: s.type })))
    } catch { setSensors([]) }
    finally { setSensorsLoading(false) }
  }, [])

  useEffect(() => { loadSensors() }, [loadSensors])

  const handleSetManualValue = async (code: string) => {
    const val = parseFloat(manualValues[code] ?? '')
    if (isNaN(val)) { setManualStatus({ code, ok: false, msg: 'Valor inválido' }); return }
    setSettingValue(code)
    setManualStatus(null)
    try {
      const res = await api.post('/sensors/manual-value', { code, value: val }).then(r => r.data)
      setSensors(prev => prev.map(s => s.code === code ? { ...s, lastValue: val } : s))
      setManualStatus({ code, ok: true, msg: `→ ${val} ${sensors.find(s => s.code === code)?.unit || ''}` })
      setTimeout(() => setManualStatus(null), 3000)
    } catch (err: unknown) {
      setManualStatus({ code, ok: false, msg: ((err as any)?.response?.data?.error?.message || (err as Error).message) })
    } finally { setSettingValue(null) }
  }

  const handlePublishAllManual = async () => {
    setSending(true)
    setManualStatus(null)
    try {
      const esp32Payload: Record<string, unknown> = { device_id: 'esp32_01' }
      for (const s of sensors) {
        const shortKey = s.code.replace('esp32_01_', '')
        const val = manualValues[s.code] ? parseFloat(manualValues[s.code]) : s.lastValue
        if (val !== null && !isNaN(val)) esp32Payload[shortKey] = val
      }
      const res = await sensorService.testMqtt({ topic, payload: esp32Payload })
      const updatedSensors: string[] = []
      for (const s of sensors) {
        const shortKey = s.code.replace('esp32_01_', '')
        if (esp32Payload[shortKey] !== undefined) {
          await api.post('/sensors/manual-value', { code: s.code, value: esp32Payload[shortKey] }).catch(() => {})
          updatedSensors.push(s.code)
        }
      }
      setSensors(prev => prev.map(s => esp32Payload[s.code.replace('esp32_01_', '')] !== undefined
        ? { ...s, lastValue: esp32Payload[s.code.replace('esp32_01_', '')] as number } : s))
      setManualStatus({ code: 'all', ok: true, msg: `Publicado y asignado a sensores: ${res.topic}` })
      setTimeout(() => setManualStatus(null), 4000)
    } catch (err: unknown) {
      setManualStatus({ code: 'all', ok: false, msg: ((err as any)?.response?.data?.error?.message || (err as Error).message) })
    } finally { setSending(false) }
  }

  const handleScroll = () => {
    if (!feedRef.current) return
    const el = feedRef.current
    autoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50
  }

  const handlePublish = async () => {
    setSending(true)
    setStatus('')
    try {
      let parsed: unknown
      try { parsed = JSON.parse(payload) } catch { parsed = payload }
      const res = await sensorService.testMqtt({
        topic,
        payload: typeof parsed === 'object' ? parsed : { value: parseFloat(payload) || 50 },
      })
      setStatus('Enviado a ' + res.topic)
    } catch (err: unknown) {
      setStatus('Error: ' + ((err as any)?.response?.data?.error?.message || (err as Error).message))
    } finally {
      setSending(false)
    }
  }

  const typeColors: Record<string, string> = {
    temperature_c: 'text-rose-600 dark:text-rose-400',
    humidity_percent: 'text-sky-600 dark:text-sky-400',
    gas_raw: 'text-amber-600 dark:text-amber-400',
    distance_cm: 'text-emerald-600 dark:text-emerald-400',
  }
  const sensorIcons: Record<string, typeof Thermometer> = {
    temperature_c: Thermometer,
    humidity_percent: Droplets,
    gas_raw: Wind,
    distance_cm: Ruler,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/50">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Inspector MQTT</h2>
            <p className="text-sm text-gray-500">Monitorea y prueba mensajes MQTT en tiempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
          {connected ? (
            <Wifi className="h-4 w-4 text-success-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-danger-500" />
          )}
          <span className={`text-sm font-semibold ${connected ? 'text-success-600' : 'text-danger-600'}`}>
            {connected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Feed panel */}
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary-600" />
              <h3 className="text-sm font-semibold text-gray-900">Feed en vivo</h3>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {messages.length}
              </span>
            </div>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-danger-600 dark:hover:bg-gray-800">
                <Trash2 className="h-3 w-3" />
                Limpiar
              </button>
            )}
          </div>
          <div
            ref={feedRef}
            onScroll={handleScroll}
            className="h-[480px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs dark:border-gray-700 dark:bg-gray-950"
          >
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-400">
                <p>Esperando mensajes MQTT...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...messages].reverse().map(msg => {
                  let displayPayload = msg.payload
                  let highlight = false
                  try {
                    const parsed = JSON.parse(msg.payload)
                    if (parsed.temperature_c !== undefined || parsed.device_id !== undefined) {
                      highlight = true
                    }
                    displayPayload = JSON.stringify(parsed, null, 2)
                  } catch {}
                  return (
                    <div key={msg.id} className={`rounded-lg border p-2 ${highlight ? 'border-primary-200 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-950/30' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'}`}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="truncate font-semibold text-primary-600 dark:text-primary-400">{msg.topic}</span>
                        <span className="shrink-0 text-gray-400">{new Date(msg.receivedAt).toLocaleTimeString()}</span>
                      </div>
                      <pre className="whitespace-pre-wrap break-all text-gray-700 dark:text-gray-300">{displayPayload}</pre>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Publish panel */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Send className="h-4 w-4 text-primary-600" />
              Publicar mensaje MQTT
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label">Topic</label>
                <input
                  className="input-field font-mono text-sm"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="controlmc/esp32/esp32_01/sensores"
                />
              </div>
              <div>
                <label className="label">Payload (JSON)</label>
                <textarea
                  className="input-field min-h-[180px] font-mono text-sm"
                  value={payload}
                  onChange={e => setPayload(e.target.value)}
                  placeholder='{"temperature_c":25.0,"humidity_percent":50}'
                />
              </div>
              <button
                onClick={handlePublish}
                disabled={sending || !topic}
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Enviando...' : 'Publicar'}
              </button>
              {status && (
                <div className={`rounded-lg p-3 text-sm ${status.startsWith('Error') ? 'bg-danger-50 text-danger-700' : 'bg-success-50 text-success-700'}`}>
                  {status}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Thermometer className="h-4 w-4 text-primary-600" />
                Valores manuales
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { setManualValues({}); loadSensors() }} className="text-xs text-gray-400 hover:text-danger-600">
                  Reset
                </button>
                <span className="text-xs text-gray-300">|</span>
                <button onClick={loadSensors} className="text-xs text-primary-600 hover:underline" disabled={sensorsLoading}>
                  {sensorsLoading ? 'Cargando...' : 'Recargar'}
                </button>
              </div>
            </div>
            {manualStatus && (
              <div className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${manualStatus.ok ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
                {manualStatus.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {manualStatus.msg}
              </div>
            )}
            <div className="space-y-2">
              {sensorsLoading ? (
                <div className="flex justify-center py-6 text-sm text-gray-400">Cargando sensores...</div>
              ) : sensors.length === 0 ? (
                <div className="flex justify-center py-6 text-sm text-gray-400">No hay sensores</div>
              ) : (
                sensors.map(s => {
                  const shortKey = s.code.replace('esp32_01_', '')
                  const Icon = sensorIcons[shortKey] || Activity
                  return (
                    <div key={s.id} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${typeColors[shortKey] || 'text-gray-400'}`} />
                          <span className="text-sm font-medium text-gray-900">{s.name}</span>
                        </div>
                        <span className="text-xs text-gray-400">{s.unit}</span>
                      </div>
                      <div className="mb-2 text-xs font-mono text-gray-500">{s.code}</div>
                      <div className="mb-2 text-lg font-bold text-gray-900">{s.lastValue ?? '—'}</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="any"
                          className="input-field flex-1 text-sm"
                          placeholder="Valor..."
                          value={manualValues[s.code] ?? ''}
                          onChange={e => setManualValues(m => ({ ...m, [s.code]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleSetManualValue(s.code)}
                        />
                        <button
                          onClick={() => handleSetManualValue(s.code)}
                          disabled={settingValue === s.code}
                          className="btn-primary shrink-0 px-3 py-1.5 text-xs"
                        >
                          {settingValue === s.code ? '...' : 'Asignar'}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            {sensors.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
                <button
                  onClick={handlePublishAllManual}
                  disabled={sending || !topic}
                  className="btn-primary flex w-full items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sending ? 'Publicando...' : 'Publicar todo como ESP32'}
                </button>
                <p className="mt-1.5 text-center text-xs text-gray-400">
                  Toma los valores escritos arriba y los envía como mensaje MQTT al topic <code className="text-primary-600">{topic}</code>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
