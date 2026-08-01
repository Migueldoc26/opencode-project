import { useState, useEffect } from 'react'
import {
  Search, Filter, ChevronLeft, ChevronRight, X,
  LogIn, Server, ClipboardList, Bell, User as UserIcon,
  Activity, RefreshCw,
} from 'lucide-react'
import { auditLogService } from '../services/api'
import LoadingIndicator from '../components/common/LoadingIndicator'

const actionIcons: Record<string, typeof Activity> = {
  LOGIN: LogIn,
  CREATE: Server,
  UPDATE: Activity,
  DELETE: X,
  STATUS_CHANGE: ClipboardList,
  ACKNOWLEDGE: Bell,
  RESOLVE: Bell,
}

const actionColors: Record<string, string> = {
  LOGIN: 'bg-blue-100 text-blue-600',
  CREATE: 'bg-success-100 text-success-600',
  UPDATE: 'bg-warning-100 text-warning-600',
  DELETE: 'bg-danger-100 text-danger-600',
  STATUS_CHANGE: 'bg-primary-100 text-primary-600',
  ACKNOWLEDGE: 'bg-amber-100 text-amber-600',
  RESOLVE: 'bg-emerald-100 text-emerald-600',
}

const entityLabels: Record<string, string> = {
  USER: 'Usuario',
  ASSET: 'Activo',
  WORK_ORDER: 'OT',
  ALERT: 'Alerta',
}

export default function ActivityLog() {
  const [logs, setLogs] = useState<{ items: any[]; total: number; page: number; totalPages: number }>({ items: [], total: 0, page: 1, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit: 30 }
      if (search) params.search = search
      if (entityFilter) params.entity = entityFilter
      if (actionFilter) params.action = actionFilter
      const data = await auditLogService.list(params)
      setLogs(data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { loadLogs() }, [page, entityFilter, actionFilter])

  useEffect(() => {
    const timer = setTimeout(() => { if (page === 1) loadLogs(); else setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const clearFilters = () => { setSearch(''); setEntityFilter(''); setActionFilter(''); setPage(1) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Registro de Actividades</h2>
          <p className="mt-1 text-sm text-gray-500">Auditoría de acciones de usuarios en el sistema</p>
        </div>
        <button onClick={loadLogs} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refrescar
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar actividades..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} className="input-field w-36">
          <option value="">Todas las entidades</option>
          <option value="USER">Usuario</option>
          <option value="ASSET">Activo</option>
          <option value="WORK_ORDER">OT</option>
          <option value="ALERT">Alerta</option>
        </select>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="input-field w-40">
          <option value="">Todas las acciones</option>
          <option value="LOGIN">Inicio de sesión</option>
          <option value="CREATE">Creación</option>
          <option value="UPDATE">Actualización</option>
          <option value="DELETE">Eliminación</option>
          <option value="STATUS_CHANGE">Cambio de estado</option>
          <option value="ACKNOWLEDGE">Reconocimiento</option>
          <option value="RESOLVE">Resolución</option>
        </select>
        {(search || entityFilter || actionFilter) && (
          <button onClick={clearFilters} className="btn-secondary flex items-center gap-2">
            <X className="h-4 w-4" />
            Limpiar
          </button>
        )}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingIndicator size={64} />
          </div>
        ) : logs.items.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-12 text-gray-400">
            <Activity className="mb-2 h-8 w-8" />
            <p className="text-sm">No se encontraron actividades</p>
          </div>
        ) : (
          logs.items.map((log: any) => {
            const Icon = actionIcons[log.action] || Activity
            const color = actionColors[log.action] || 'bg-gray-100 text-gray-600'
            return (
              <div key={log.id} className="card">
                <div className="flex items-start gap-4">
                  <div className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-full ' + color}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{log.description}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {log.user?.name || 'Sistema'}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            {log.entity}
                          </span>
                          {log.entityId && (
                            <span className="font-mono text-gray-400">#{log.entityId.slice(0, 8)}</span>
                          )}
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {logs.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            P&aacute;gina {logs.page} de {logs.totalPages} ({logs.total} registros)
          </p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary px-3 py-1.5 text-xs">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button disabled={page >= logs.totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary px-3 py-1.5 text-xs">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
