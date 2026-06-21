import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Edit, Trash2, Server, Filter, X,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { assetService, plantService } from '../services/api'

interface Asset {
  id: string
  name: string
  type: string
  status: string
  location: string
  plantId: string
  area: string
  serialNumber: string
  model: string
  manufacturer: string
  installDate: string
}

const statusColors: Record<string, string> = {
  OPERATIONAL: 'badge-success',
  MAINTENANCE: 'badge-warning',
  BREAKDOWN: 'badge-danger',
  OFFLINE: 'badge-gray',
}

export default function Assets() {
  const navigate = useNavigate()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editAsset, setEditAsset] = useState<Asset | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [plants, setPlants] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({
    name: '', type: '', status: 'OPERATIONAL', location: '', plantId: '',
    area: '', serialNumber: '', model: '', manufacturer: '', installDate: '',
  })
  const [error, setError] = useState<string | null>(null)
  const limit = 10

  const loadAssets = async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit }
      if (search) params.search = search
      if (filterStatus) params.status = filterStatus
      const data = await assetService.list(params)
      setAssets(data.items || data.data || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssets()
    plantService.list().then(d => setPlants(d || [])).catch(() => {})
  }, [page, filterStatus])

  useEffect(() => {
    const timer = setTimeout(() => { if (page === 1) loadAssets(); else setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const totalPages = Math.ceil(total / limit)

  const openCreate = () => {
    setEditAsset(null)
    setForm({ name: '', type: '', status: 'OPERATIONAL', location: '', plantId: '', area: '', serialNumber: '', model: '', manufacturer: '', installDate: '' })
    setShowModal(true)
  }

  const openEdit = (asset: Asset) => {
    setEditAsset(asset)
    setForm({
      name: asset.name, type: asset.type, status: asset.status, location: asset.location,
      plantId: asset.plantId, area: asset.area, serialNumber: asset.serialNumber,
      model: asset.model, manufacturer: asset.manufacturer, installDate: asset.installDate,
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    setError(null)
    try {
      if (editAsset) {
        await assetService.update(editAsset.id, form)
      } else {
        await assetService.create(form)
      }
      setShowModal(false)
      loadAssets()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Operation failed')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this asset?')) return
    try {
      await assetService.remove(id)
      loadAssets()
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Assets</h2>
          <p className="mt-1 text-sm text-gray-500">Manage your industrial equipment</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Asset
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="input-field w-40"
        >
          <option value="">All Status</option>
          <option value="OPERATIONAL">Operational</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="BREAKDOWN">Breakdown</option>
          <option value="OFFLINE">Offline</option>
        </select>
        {(search || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterStatus('') }} className="btn-secondary flex items-center gap-2">
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Type</th>
                <th className="table-header">Status</th>
                <th className="table-header">Location</th>
                <th className="table-header">Serial #</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-sm text-gray-500">No assets found</td></tr>
              ) : (
                assets.map(asset => (
                  <tr key={asset.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/assets/${asset.id}`)}>
                    <td className="table-cell font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-gray-400" />
                        {asset.name}
                      </div>
                    </td>
                    <td className="table-cell text-gray-600">{asset.type}</td>
                    <td className="table-cell">
                      <span className={`badge ${statusColors[asset.status] || 'badge-gray'}`}>{asset.status}</span>
                    </td>
                    <td className="table-cell text-gray-600">{asset.location || '-'}</td>
                    <td className="table-cell text-gray-600">{asset.serialNumber || '-'}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(asset)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(asset.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-danger-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-gray-500">Page {page} of {totalPages} ({total} total)</p>
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{editAsset ? 'Edit Asset' : 'Create Asset'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Name *</label>
                  <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Type *</label>
                  <input className="input-field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input-field" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="OPERATIONAL">Operational</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="BREAKDOWN">Breakdown</option>
                    <option value="OFFLINE">Offline</option>
                  </select>
                </div>
                <div>
                  <label className="label">Plant</label>
                  <select className="input-field" value={form.plantId} onChange={e => setForm(f => ({ ...f, plantId: e.target.value }))}>
                    <option value="">Select plant</option>
                    {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Location</label>
                  <input className="input-field" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Area</label>
                  <input className="input-field" value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Serial Number</label>
                  <input className="input-field" value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Model</label>
                  <input className="input-field" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Manufacturer</label>
                  <input className="input-field" value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Install Date</label>
                  <input type="date" className="input-field" value={form.installDate} onChange={e => setForm(f => ({ ...f, installDate: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleSubmit} className="btn-primary">{editAsset ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
