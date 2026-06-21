import { useState, useEffect } from 'react'
import {
  Search, Plus, CheckCircle2, XCircle, AlertTriangle,
  Camera, FileText, ChevronLeft, ChevronRight, ClipboardCheck,
} from 'lucide-react'
import { inspectionService } from '../services/api'
import ObservationCamera from '../components/common/ObservationCamera'

interface Inspection {
  id: string
  title: string
  assetName: string
  assetId: string
  status: string
  scheduledDate: string
  completedDate?: string
  assignedTo: string
  checklistItems?: { name: string; passed: boolean }[]
  anomalies?: { description: string; severity: string }[]
}

function ChecklistProgress({ items }: { items: { name: string; passed: boolean }[] }) {
  if (!items?.length) return null
  const passed = items.filter(i => i.passed).length
  const total = items.length
  const pct = Math.round((passed / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-gray-200">
        <div className={`h-full rounded-full ${pct === 100 ? 'bg-success-500' : 'bg-warning-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500">{passed}/{total}</span>
    </div>
  )
}

export default function Inspections() {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '', assetId: '', scheduledDate: '', assignedTo: '',
  })
  const limit = 10

  const loadInspections = async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit }
      if (search) params.search = search
      const data = await inspectionService.list(params)
      setInspections(data.items || data.data || [])
      setTotal(data.total || 0)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { loadInspections() }, [page])

  useEffect(() => {
    const timer = setTimeout(() => { if (page === 1) loadInspections(); else setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const totalPages = Math.ceil(total / limit)

  const handleCreate = async () => {
    setError(null)
    try {
      await inspectionService.create(form)
      setShowModal(false)
      setForm({ title: '', assetId: '', scheduledDate: '', assignedTo: '' })
      loadInspections()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create')
    }
  }

  const handlePhotoUpload = async (blob: Blob) => {
    const formData = new FormData()
    formData.append('file', blob, `inspection_${Date.now()}.jpg`)
    try {
      await inspectionService.addMedia(selectedInspection!.id, formData)
      setShowCamera(false)
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inspections</h2>
          <p className="mt-1 text-sm text-gray-500">Schedule and track equipment inspections</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCamera(true)} className="btn-secondary flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Camera
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Inspection
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search inspections..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : inspections.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-12 text-gray-400">
            <ClipboardCheck className="mb-2 h-8 w-8" />
            <p className="text-sm">No inspections found</p>
          </div>
        ) : (
          inspections.map(inspection => (
            <div key={inspection.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900">{inspection.title}</h4>
                    <span className={`badge ${
                      inspection.status === 'COMPLETED' ? 'badge-success' :
                      inspection.status === 'IN_PROGRESS' ? 'badge-warning' :
                      'badge-gray'
                    }`}>{inspection.status}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span>Asset: {inspection.assetName || inspection.assetId}</span>
                    <span>Assigned: {inspection.assignedTo}</span>
                    <span>Scheduled: {new Date(inspection.scheduledDate).toLocaleDateString()}</span>
                    {inspection.completedDate && (
                      <span>Completed: {new Date(inspection.completedDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>

              {inspection.checklistItems && inspection.checklistItems.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium text-gray-500">Checklist Progress</p>
                  <ChecklistProgress items={inspection.checklistItems} />
                </div>
              )}

              {inspection.anomalies && inspection.anomalies.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-danger-500" />
                    Anomalies Found
                  </p>
                  {inspection.anomalies.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-danger-50 px-3 py-2">
                      <XCircle className="h-3 w-3 text-danger-500" />
                      <span className="text-xs text-danger-700">{a.description}</span>
                      <span className={`badge ml-auto ${a.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>
                        {a.severity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary px-3 py-1.5 text-xs">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary px-3 py-1.5 text-xs">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="modal-overlay" onClick={() => setShowCamera(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <ObservationCamera onUpload={handlePhotoUpload} onCapture={(blob) => console.log('Captured', blob)} />
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Schedule Inspection</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="label">Title *</label>
                <input className="input-field" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Asset ID</label>
                <input className="input-field" value={form.assetId} onChange={e => setForm(f => ({ ...f, assetId: e.target.value }))} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Scheduled Date</label>
                  <input type="date" className="input-field" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Assigned To</label>
                  <input className="input-field" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleCreate} className="btn-primary">Schedule</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
