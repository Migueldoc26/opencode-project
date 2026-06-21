import { useState, useEffect, useCallback } from 'react'
import {
  Bell, AlertTriangle, CheckCircle2, X, Filter,
  Search, Clock, Server, User, Wifi,
} from 'lucide-react'
import { alertService } from '../services/api'
import { useWebSocket } from '../context/WebSocketContext'

interface Alert {
  id: string
  title: string
  message: string
  severity: string
  status: string
  assetName: string
  acknowledgedBy?: string
  resolvedBy?: string
  createdAt: string
  acknowledgedAt?: string
  resolvedAt?: string
}

const severityConfig: Record<string, { color: string; icon: typeof AlertTriangle }> = {
  CRITICAL: { color: 'badge-danger', icon: AlertTriangle },
  WARNING: { color: 'badge-warning', icon: AlertTriangle },
  INFO: { color: 'badge-gray', icon: Bell },
}

export default function Alerts() {
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([])
  const [history, setHistory] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'active' | 'history'>('active')
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const { subscribe, unsubscribe } = useWebSocket()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [active, hist] = await Promise.all([
        alertService.getActive(),
        alertService.getHistory({ limit: 50 }),
      ])
      setActiveAlerts(active || [])
      setHistory(hist?.items || hist?.data || hist || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    subscribe('alert:new', (data: unknown) => {
      const alert = data as Alert
      setActiveAlerts(prev => [alert, ...prev])
    })
    subscribe('alert:update', (data: unknown) => {
      const updated = data as Alert
      setActiveAlerts(prev => prev.filter(a => a.id !== updated.id))
      setHistory(prev => [updated, ...prev])
    })
    return () => {
      unsubscribe('alert:new')
      unsubscribe('alert:update')
    }
  }, [subscribe, unsubscribe])

  const handleAcknowledge = async (id: string) => {
    try {
      await alertService.acknowledge(id)
      loadData()
    } catch { /* ignore */ }
  }

  const handleResolve = async (id: string) => {
    try {
      await alertService.resolve(id)
      loadData()
    } catch { /* ignore */ }
  }

  const filteredHistory = history.filter(a => {
    if (search && !a.title?.toLowerCase().includes(search.toLowerCase()) && !a.message?.toLowerCase().includes(search.toLowerCase())) return false
    if (severityFilter && a.severity !== severityFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Alerts</h2>
        <p className="mt-1 text-sm text-gray-500">Monitor and manage system alerts</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b gap-4">
        <button
          onClick={() => setTab('active')}
          className={tab === 'active' ? 'tab-active' : 'tab'}
        >
          Active
          {activeAlerts.length > 0 && (
            <span className="ml-2 rounded-full bg-danger-500 px-2 py-0.5 text-xs text-white">
              {activeAlerts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('history')}
          className={tab === 'history' ? 'tab-active' : 'tab'}
        >
          History
        </button>
      </div>

      {tab === 'history' && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search history..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="input-field w-36"
          >
            <option value="">All Severity</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        </div>
      )}

      {/* Active Alerts */}
      {tab === 'active' && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : activeAlerts.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-12 text-gray-400">
              <CheckCircle2 className="mb-2 h-8 w-8 text-success-500" />
              <p className="text-sm font-medium text-gray-900">All Clear</p>
              <p className="text-xs">No active alerts</p>
            </div>
          ) : (
            activeAlerts.map(alert => {
              const config = severityConfig[alert.severity] || severityConfig.INFO
              const Icon = config.icon
              return (
                <div key={alert.id} className={`card ${alert.severity === 'CRITICAL' ? 'ring-2 ring-danger-500' : ''}`}>
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      alert.severity === 'CRITICAL' ? 'bg-danger-100' :
                      alert.severity === 'WARNING' ? 'bg-warning-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        alert.severity === 'CRITICAL' ? 'text-danger-600' :
                        alert.severity === 'WARNING' ? 'text-warning-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">{alert.title}</h4>
                          <p className="text-sm text-gray-600">{alert.message}</p>
                        </div>
                        <span className={`badge ${config.color}`}>{alert.severity}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        {alert.assetName && (
                          <span className="flex items-center gap-1">
                            <Server className="h-3 w-3" />
                            {alert.assetName}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(alert.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleAcknowledge(alert.id)} className="btn-secondary flex items-center gap-1 px-3 py-1.5 text-xs">
                        <User className="h-3 w-3" />
                        Acknowledge
                      </button>
                      <button onClick={() => handleResolve(alert.id)} className="btn-success flex items-center gap-1 px-3 py-1.5 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        Resolve
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-12 text-gray-400">
              <Bell className="mb-2 h-8 w-8" />
              <p className="text-sm">No alerts in history</p>
            </div>
          ) : (
            filteredHistory.map(alert => {
              const config = severityConfig[alert.severity] || severityConfig.INFO
              const Icon = config.icon
              return (
                <div key={alert.id} className="card">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      alert.severity === 'CRITICAL' ? 'bg-danger-100' :
                      alert.severity === 'WARNING' ? 'bg-warning-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        alert.severity === 'CRITICAL' ? 'text-danger-600' :
                        alert.severity === 'WARNING' ? 'text-warning-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">{alert.title}</h4>
                          <p className="text-sm text-gray-600">{alert.message}</p>
                        </div>
                        <span className={`badge ${config.color}`}>{alert.severity}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created: {new Date(alert.createdAt).toLocaleString()}
                        </span>
                        {alert.resolvedAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-success-500" />
                            Resolved: {new Date(alert.resolvedAt).toLocaleString()}
                          </span>
                        )}
                        {alert.resolvedBy && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            By: {alert.resolvedBy}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`badge ${alert.status === 'RESOLVED' ? 'badge-success' : 'badge-warning'}`}>
                      {alert.status}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
