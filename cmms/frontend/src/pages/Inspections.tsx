import { useState, useEffect } from 'react'
import {
  Search, Plus, X, CheckCircle2, AlertTriangle, XCircle,
  Camera, FileText, ChevronLeft, ChevronRight, ClipboardCheck,
} from 'lucide-react'
import { assetService, inspectionService } from '../services/api'
import ObservationCamera from '../components/common/ObservationCamera'
import LoadingIndicator from '../components/common/LoadingIndicator'
import { useTranslation } from '../context/TranslationContext'

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
  area?: { id: string; name: string }
  conductedBy?: { id: string; name: string }
  _count?: { anomalies?: number; media?: number }
}

interface AssetOption {
  id: string
  name: string
  code?: string
  areaId?: string
  area?: { id: string; name: string }
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
  const { t } = useTranslation()
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [assets, setAssets] = useState<AssetOption[]>([])
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
    assetService.list({ limit: 500 })
      .then(data => setAssets(data.items || data.data || []))
      .catch(() => setAssets([]))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => { if (page === 1) loadInspections(); else setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const totalPages = Math.ceil(total / limit)

  const handleCreate = async () => {
    setError(null)
    try {
      const asset = assets.find(a => a.id === form.assetId)
      const areaId = asset?.area?.id || asset?.areaId
      if (!asset) {
        setError(t('inspections.asset-required'))
        return
      }
      if (!areaId) {
        setError(t('inspections.area-required'))
        return
      }
      await inspectionService.create({
        title: form.title,
        scheduledDate: form.scheduledDate || undefined,
        areaId,
        metadata: form.assetId ? { assetId: form.assetId, assetName: asset?.name } : undefined,
      })
      setShowModal(false)
      setForm({ title: '', assetId: '', scheduledDate: '', assignedTo: '' })
      loadInspections()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || t('inspections.create-error'))
    }
  }

  const handlePhotoUpload = async (blob: Blob) => {
    if (!selectedInspection) {
      setShowCamera(false)
      return
    }
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
          <h2 className="text-2xl font-bold text-gray-900">{t('inspections.title')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('inspections.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setSelectedInspection(inspections[0] || null); setShowCamera(true) }} disabled={inspections.length === 0} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
            <Camera className="h-4 w-4" />
            {t('inspections.camera')}
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('inspections.new')}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('inspections.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingIndicator prominent label="Cargando inspecciones..." state="searching" />
          </div>
        ) : inspections.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-12 text-gray-400">
            <ClipboardCheck className="mb-2 h-8 w-8" />
            <p className="text-sm">{t('inspections.none')}</p>
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
                    <span>{t('inspections.area')}: {inspection.area?.name || inspection.assetName || inspection.assetId || '-'}</span>
                    <span>{t('inspections.assigned-to')}: {inspection.conductedBy?.name || inspection.assignedTo || '-'}</span>
                    <span>{t('inspections.scheduled-date')}: {inspection.scheduledDate ? new Date(inspection.scheduledDate).toLocaleDateString() : '-'}</span>
                    {inspection.completedDate && (
                      <span>{t('inspections.completed')}: {new Date(inspection.completedDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>

              {inspection.checklistItems && inspection.checklistItems.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-medium text-gray-500">{t('inspections.checklist-progress')}</p>
                  <ChecklistProgress items={inspection.checklistItems} />
                </div>
              )}

              {inspection.anomalies && inspection.anomalies.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-danger-500" />
                    {t('inspections.anomalies')}
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
              {!inspection.anomalies?.length && inspection._count?.anomalies ? (
                <div className="mt-3 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-700">
                  Esta inspección tiene {inspection._count.anomalies} anomalía(s) registrada(s).
                </div>
              ) : null}
              <div className="mt-3 flex justify-end">
                <button onClick={() => { setSelectedInspection(inspection); setShowCamera(true) }} className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-xs">
                  <Camera className="h-3.5 w-3.5" />
                  {t('inspections.evidence')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{page} / {totalPages}</p>
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
            <ObservationCamera onUpload={handlePhotoUpload} onCapture={() => {}} />
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{t('inspections.schedule')}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="label">{t('inspections.title-field')} *</label>
                <input className="input-field" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="label">{t('inspections.related-asset')}</label>
                <select className="input-field" value={form.assetId} onChange={e => setForm(f => ({ ...f, assetId: e.target.value }))}>
                  <option value="">{t('sensors.select-asset')}</option>
                  {assets.map(asset => (
                    <option key={asset.id} value={asset.id}>{asset.name}{asset.code ? ` (${asset.code})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">{t('inspections.scheduled-date')}</label>
                  <input type="date" className="input-field" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label">{t('inspections.assigned-to')}</label>
                  <input className="input-field" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowModal(false)} className="btn-secondary">{t('common.cancel')}</button>
                <button onClick={handleCreate} className="btn-primary">{t('inspections.schedule')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
