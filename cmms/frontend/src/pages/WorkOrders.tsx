import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Columns, List, ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import { workOrderService } from '../services/api'

interface WorkOrder {
  id: string
  title: string
  description: string
  status: string
  priority: string
  assetId: string
  assetName: string
  assignedTo: string
  dueDate: string
  createdAt: string
}

const columns = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

const columnLabels: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const columnColors: Record<string, string> = {
  PENDING: 'bg-gray-100 border-gray-300',
  IN_PROGRESS: 'bg-warning-50 border-warning-300',
  COMPLETED: 'bg-success-50 border-success-300',
  CANCELLED: 'bg-danger-50 border-danger-300',
}

const priorityColors: Record<string, string> = {
  HIGH: 'badge-danger',
  MEDIUM: 'badge-warning',
  LOW: 'badge-gray',
}

export default function WorkOrders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '', description: '', priority: 'MEDIUM', assetId: '', assignedTo: '', dueDate: '',
  })

  useEffect(() => {
    setLoading(true)
    workOrderService.list()
      .then(data => setOrders(data.items || data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await workOrderService.updateStatus(id, status)
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    } catch { /* ignore */ }
  }

  const handleCreate = async () => {
    setError(null)
    try {
      const created = await workOrderService.create(form)
      setOrders(prev => [...prev, created])
      setShowModal(false)
      setForm({ title: '', description: '', priority: 'MEDIUM', assetId: '', assignedTo: '', dueDate: '' })
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create')
    }
  }

  const getOrdersByStatus = (status: string) => orders.filter(o => o.status === status)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Work Orders</h2>
          <p className="mt-1 text-sm text-gray-500">Manage and track maintenance work</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-white">
            <button
              onClick={() => setView('kanban')}
              className={`rounded-l-lg px-3 py-2 ${view === 'kanban' ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Columns className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('table')}
              className={`rounded-r-lg px-3 py-2 ${view === 'table' ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Order
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map(col => (
            <div key={col} className={`rounded-xl border p-4 ${columnColors[col]}`}>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                {columnLabels[col]}
                <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs text-gray-500">
                  {getOrdersByStatus(col).length}
                </span>
              </h3>
              <div className="space-y-3">
                {getOrdersByStatus(col).map(order => (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/work-orders/${order.id}`)}
                    className="cursor-pointer rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">{order.id}</span>
                      <span className={`badge ${priorityColors[order.priority] || 'badge-gray'}`}>
                        {order.priority}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900">{order.title}</h4>
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">{order.description}</p>
                    {order.assetName && (
                      <p className="mt-2 text-xs text-gray-400">Asset: {order.assetName}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-400">{order.assignedTo || 'Unassigned'}</span>
                      {col === 'PENDING' && (
                        <button
                          onClick={e => { e.stopPropagation(); handleStatusChange(order.id, 'IN_PROGRESS') }}
                          className="btn-primary py-1 px-2 text-xs"
                        >
                          Start
                        </button>
                      )}
                      {col === 'IN_PROGRESS' && (
                        <button
                          onClick={e => { e.stopPropagation(); handleStatusChange(order.id, 'COMPLETED') }}
                          className="btn-success py-1 px-2 text-xs"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">ID</th>
                  <th className="table-header">Title</th>
                  <th className="table-header">Asset</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Priority</th>
                  <th className="table-header">Assigned To</th>
                  <th className="table-header">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-sm text-gray-500">Loading...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-sm text-gray-500">No work orders</td></tr>
                ) : (
                  orders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/work-orders/${order.id}`)}>
                      <td className="table-cell font-medium">{order.id}</td>
                      <td className="table-cell">{order.title}</td>
                      <td className="table-cell text-gray-600">{order.assetName || '-'}</td>
                      <td className="table-cell">
                        <span className={`badge ${
                          order.status === 'COMPLETED' ? 'badge-success' :
                          order.status === 'IN_PROGRESS' ? 'badge-warning' :
                          order.status === 'CANCELLED' ? 'badge-danger' :
                          'badge-gray'
                        }`}>{order.status}</span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${priorityColors[order.priority] || 'badge-gray'}`}>{order.priority}</span>
                      </td>
                      <td className="table-cell text-gray-600">{order.assignedTo || '-'}</td>
                      <td className="table-cell text-gray-600">{order.dueDate ? new Date(order.dueDate).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Create Work Order</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="label">Title *</label>
                <input className="input-field" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Priority</label>
                  <select className="input-field" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="label">Asset ID</label>
                  <input className="input-field" value={form.assetId} onChange={e => setForm(f => ({ ...f, assetId: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Assigned To</label>
                  <input className="input-field" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input type="date" className="input-field" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleCreate} className="btn-primary">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
