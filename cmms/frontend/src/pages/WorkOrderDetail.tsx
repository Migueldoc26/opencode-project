import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Clock, User, Wrench, CheckCircle2, Circle, Package,
  AlertTriangle, MessageSquare,
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

interface TimelineEvent {
  id: string
  action: string
  user: string
  timestamp: string
}

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  const activities: Activity[] = [
    { id: '1', description: 'Inspect conveyor belt tension', completed: true },
    { id: '2', description: 'Replace worn rollers', completed: true },
    { id: '3', description: 'Lubricate chain drive', completed: false },
    { id: '4', description: 'Test emergency stop', completed: false },
    { id: '5', description: 'Document findings', completed: false },
  ]

  const spareParts: SparePart[] = [
    { id: '1', name: 'Conveyor Roller 150mm', quantity: 4, reference: 'CR-150-SS' },
    { id: '2', name: 'Bearing SKF 6205', quantity: 2, reference: 'SKF-6205-2Z' },
    { id: '3', name: 'Lubricant Grease NLGI 2', quantity: 1, reference: 'LUBE-NLGI2-1KG' },
  ]

  const timeline: TimelineEvent[] = [
    { id: '1', action: 'Work order created', user: 'John Doe', timestamp: '2024-06-10 08:00' },
    { id: '2', action: 'Assigned to Sarah Miller', user: 'John Doe', timestamp: '2024-06-10 08:05' },
    { id: '3', action: 'Started work', user: 'Sarah Miller', timestamp: '2024-06-11 09:00' },
    { id: '4', action: 'Parts requested', user: 'Sarah Miller', timestamp: '2024-06-11 09:30' },
  ]

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
            <p className="text-sm text-gray-500">ID: {order.id as string}</p>
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
            <h3 className="card-title mb-3">Description</h3>
            <p className="text-sm text-gray-600">{order.description as string || 'No description provided.'}</p>
          </div>

          <div>
            <h3 className="card-title mb-3">Activities Checklist</h3>
            <div className="space-y-2">
              {activities.map(activity => (
                <div key={activity.id} className="flex items-center gap-3 rounded-lg border p-3">
                  {activity.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-success-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300" />
                  )}
                  <span className={`text-sm ${activity.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {activity.description}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="card-title mb-3">Spare Parts Used</h3>
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
                  {spareParts.map(part => (
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
                  ))}
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
                  <p className="text-gray-500">Assigned To</p>
                  <p className="font-medium text-gray-900">{order.assignedTo as string || 'Unassigned'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Wrench className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Asset</p>
                  <p className="font-medium text-gray-900">{order.assetName as string || order.assetId as string || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Due Date</p>
                  <p className="font-medium text-gray-900">
                    {order.dueDate ? new Date(order.dueDate as string).toLocaleDateString() : 'Not set'}
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
            <h3 className="card-title mb-3">Timeline</h3>
            <div className="space-y-4">
              {timeline.map(event => (
                <div key={event.id} className="relative flex gap-3 pl-4 before:absolute before:left-0 before:top-2 before:h-full before:w-0.5 before:bg-gray-200 last:before:hidden">
                  <div className="absolute left-0 top-2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary-600" />
                  <div>
                    <p className="text-sm text-gray-900">{event.action}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="h-3 w-3" />
                      {event.user}
                      <Clock className="h-3 w-3" />
                      {event.timestamp}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
