import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, User, Shield, ShieldAlert, Users, Key, X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { userService } from '../services/api'
import LoadingIndicator from '../components/common/LoadingIndicator'

interface UserData {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  isActive: boolean
  createdAt: string
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  SUPERVISOR: 'Supervisor',
  TECHNICIAN: 'Técnico',
  OPERATOR: 'Operador',
  VIEWER: 'Visor',
}

const roleColors: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  SUPERVISOR: 'bg-blue-100 text-blue-700',
  TECHNICIAN: 'bg-green-100 text-green-700',
  OPERATOR: 'bg-amber-100 text-amber-700',
  VIEWER: 'bg-gray-100 text-gray-700',
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<UserData | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null)
  const [passwordUser, setPasswordUser] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'TECHNICIAN', phone: '' })
  const [error, setError] = useState<string | null>(null)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await userService.list()
      setUsers(res.data || res || [])
    } catch { setError('Error al cargar usuarios') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadUsers() }, [])

  const openCreate = () => {
    setEditUser(null)
    setForm({ name: '', email: '', password: '', role: 'TECHNICIAN', phone: '' })
    setError(null)
    setShowModal(true)
  }

  const openEdit = (u: UserData) => {
    setEditUser(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone || '' })
    setError(null)
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      if (editUser) {
        const data: Record<string, unknown> = { name: form.name, email: form.email, role: form.role }
        if (form.phone) data.phone = form.phone
        await userService.update(editUser.id, data)
      } else {
        await userService.create({ name: form.name, email: form.email, password: form.password, role: form.role, phone: form.phone || undefined })
      }
      setShowModal(false)
      loadUsers()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al guardar usuario'
      setError(msg)
    }
  }

  const toggleStatus = async (u: UserData) => {
    try {
      await userService.update(u.id, { isActive: !u.isActive })
      loadUsers()
    } catch { setError('Error al cambiar estado') }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordUserId) return
    try {
      await userService.updatePassword(passwordUserId, passwordUser)
      setShowPasswordModal(false)
      setPasswordUser('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al cambiar contraseña'
      setError(msg)
    }
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500">Gestiona los usuarios del sistema ({users.length})</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 px-4 py-2">
          <Plus className="h-4 w-4" /> Nuevo usuario
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Buscar por nombre o correo..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Usuario</th>
                <th className="table-header">Correo</th>
                <th className="table-header">Rol</th>
                <th className="table-header">Teléfono</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Creado</th>
                <th className="table-header text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center"><div className="flex items-center justify-center"><LoadingIndicator prominent label="Cargando usuarios..." state="searching" /></div></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-sm text-gray-500">No se encontraron usuarios</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-gray-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="table-cell text-gray-600">{u.email}</td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[u.role] || 'bg-gray-100 text-gray-700'}`}>
                      {u.role === 'ADMIN' ? <ShieldAlert className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                      {roleLabels[u.role] || u.role}
                    </span>
                  </td>
                  <td className="table-cell text-gray-600">{u.phone || '-'}</td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="table-cell text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="table-cell">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700" title="Editar">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => { setPasswordUserId(u.id); setPasswordUser(''); setShowPasswordModal(true) }} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700" title="Cambiar contraseña">
                        <Key className="h-4 w-4" />
                      </button>
                      <button onClick={() => toggleStatus(u)} className={`rounded-lg p-2 ${u.isActive ? 'text-gray-500 hover:bg-red-50 hover:text-red-600' : 'text-green-600 hover:bg-green-50'}`} title={u.isActive ? 'Desactivar' : 'Activar'}>
                        {u.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                      </button>
                      <button onClick={async () => {
                        if (!confirm('¿Eliminar este usuario? Se desactivará si tiene registros asociados.')) return
                        try {
                          await userService.remove(u.id)
                          loadUsers()
                        } catch { setError('Error al eliminar usuario') }
                      }} className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600" title="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editUser ? 'Editar usuario' : 'Nuevo usuario'}</h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Nombre completo" />
              </div>
              <div>
                <label className="label">Correo</label>
                <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="correo@ejemplo.cl" />
              </div>
              {!editUser && (
                <div>
                  <label className="label">Contraseña</label>
                  <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="input-field" placeholder="Mínimo 6 caracteres" minLength={6} />
                </div>
              )}
              <div>
                <label className="label">Rol</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="input-field">
                  {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="Opcional" />
              </div>
              <button type="submit" className="btn-primary w-full py-2.5">
                {editUser ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPasswordModal(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Cambiar contraseña</h2>
              <button onClick={() => setShowPasswordModal(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="label">Nueva contraseña</label>
                <input type="password" required value={passwordUser} onChange={e => setPasswordUser(e.target.value)} className="input-field" placeholder="Mínimo 6 caracteres" minLength={6} />
              </div>
              <button type="submit" className="btn-primary w-full py-2.5">Actualizar contraseña</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
