import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Clock, User, Wrench, CheckCircle2, Circle, Package,
  AlertTriangle, MessageSquare, X,
} from 'lucide-react'
import { workOrderService } from '../services/api'

interface Activity {
  id: string
  description: string
  completed: boolean
  assignedTo?: string
}

interface SparePart {
  id: string
  name: string
  quantity: number
  reference: string
}

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    workOrderService.getById(id)
      .then(setOrder)
      .catch(() => navigate('/work-orders'))
      .finally(() => setLoading(false))
  }, [id])

  const handleStatusUpdate = async (status: string) => {
    if (!id) return
    try {
      await workOrderService.updateStatus(id, status)
      setOrder(prev => prev ? { ...prev, status } : prev)
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (!order) return null

  const activities = Array.isArray(order.activities) ? order.activities as Activity[] : []
  const spareParts = Array.isArray(order.spareParts)
    ? (order.spareParts as any[]).map(part => ({
        id: part.id,
        name: part.sparePart?.name || part.name || 'Repuesto',
        quantity: part.quantity || 0,
        reference: part.sparePart?.code || part.reference || '-',
      })) as SparePart[]
    : []
  const asset = order.asset as { id?: string; name?: string; code?: string } | undefined
  const assignedTo = order.assignedTo as { name?: string; email?: string } | undefined
  const createdBy = order.createdBy as { name?: string; email?: string } | undefined
  const inspection = order.inspection as { id?: string; title?: string; status?: string } | undefined
  const scheduledDate = order.scheduledDate as string | undefined
  const startDate = order.startDate as string | undefined
  const completionDate = order.completionDate as string | undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/work-orders')} className="btn-secondary px-3 py-2">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{order.title as string}</h2>
            <p className="text-sm text-gray-500">ID: {(order.code as string) || (order.id as string)}</p>
          </div>
          <span className={`badge ${
            order.status === 'COMPLETED' ? 'badge-success' :
            order.status === 'IN_PROGRESS' ? 'badge-warning' :
            order.status === 'CANCELLED' ? 'badge-danger' : 'badge-gray'
          }`}>{order.status as string}</span>
        </div>
        <div className="flex items-center gap-2">
          {order.status === 'PENDING' && (
            <button onClick={() => handleStatusUpdate('IN_PROGRESS')} className="btn-primary flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Start Work
            </button>
          )}
          {order.status === 'IN_PROGRESS' && (
            <button onClick={() => handleStatusUpdate('COMPLETED')} className="btn-success flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Complete
            </button>
          )}
          {(order.status === 'PENDING' || order.status === 'IN_PROGRESS') && (
            <button onClick={() => handleStatusUpdate('CANCELLED')} className="btn-danger flex items-center gap-2">
              <X className="h-4 w-4" />
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="card lg:col-span-2 space-y-6">
          <div>
            <h3 className="card-title mb-3">Descripción</h3>
            <p className="text-sm text-gray-600">{order.description as string || 'No description provided.'}</p>
          </div>

          <div>
            <h3 className="card-title mb-3">Actividades reales</h3>
            <div className="space-y-2">
              {activities.length > 0 ? (
                activities.map(activity => (
                  <div key={activity.id} className="flex items-center gap-3 rounded-lg border p-3">
                    {activity.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-success-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300" />
                    )}
                    <span className={`text-sm ${activity.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {activity.description || 'Actividad sin descripción'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-3 text-sm text-gray-500">
                  Esta orden no tiene actividades registradas.
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="card-title mb-3">Repuestos reales utilizados</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Part Name</th>
                    <th className="table-header">Reference</th>
                    <th className="table-header">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {spareParts.length > 0 ? (
                    spareParts.map(part => (
                      <tr key={part.id}>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-400" />
                            {part.name}
                          </div>
                        </td>
                        <td className="table-cell text-gray-600">{part.reference}</td>
                        <td className="table-cell text-gray-600">{part.quantity}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={3} className="table-cell text-center text-gray-500">Sin repuestos registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="card-title mb-3">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Asignado a</p>
                  <p className="font-medium text-gray-900">{assignedTo?.name || 'Sin asignar'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Wrench className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Activo</p>
                  <p className="font-medium text-gray-900">{asset?.name || order.assetId as string || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Fecha programada</p>
                  <p className="font-medium text-gray-900">
                    {scheduledDate ? new Date(scheduledDate).toLocaleDateString() : 'No definida'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Priority</p>
                  <span className={`badge ${
                    order.priority === 'HIGH' ? 'badge-danger' :
                    order.priority === 'MEDIUM' ? 'badge-warning' : 'badge-gray'
                  }`}>{order.priority as string}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title mb-3">Origen y trazabilidad</h3>
            <div className="space-y-4">
              {[
                { label: 'Creada', user: createdBy?.name, date: order.createdAt as string },
                { label: 'Iniciada', user: assignedTo?.name, date: startDate },
                { label: 'Completada', user: assignedTo?.name, date: completionDate },
              ].filter(event => event.date).map(event => (
                <div key={event.label} className="relative flex gap-3 pl-4 before:absolute before:left-0 before:top-2 before:h-full before:w-0.5 before:bg-gray-200 last:before:hidden">
                  <div className="absolute left-0 top-2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary-600" />
                  <div>
                    <p className="text-sm text-gray-900">{event.label}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="h-3 w-3" />
                      {event.user || '-'}
                      <Clock className="h-3 w-3" />
                      {new Date(event.date as string).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              {inspection?.id && (
                <div className="rounded-lg border border-primary-100 bg-primary-50 p-3 text-sm text-primary-800">
                  Originada desde inspección: {inspection.title} ({inspection.status})
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
