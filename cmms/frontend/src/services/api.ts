import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('cmms_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cmms_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authService = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }).then(r => r.data),
  register: (data: { email: string; password: string; name: string }) => api.post('/auth/register', data).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  updateProfile: (data: { name?: string; phone?: string; avatar?: string }) => api.put('/auth/profile', data).then(r => r.data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.put('/auth/password', data).then(r => r.data),
}

export const assetService = {
  list: (params?: Record<string, unknown>) => api.get('/assets', { params }).then(r => r.data),
  getById: (id: string) => api.get(`/assets/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/assets', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/assets/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/assets/${id}`).then(r => r.data),
  getSensors: (id: string) => api.get(`/assets/${id}/sensors`).then(r => r.data),
  getReadings: (id: string, params?: Record<string, unknown>) => api.get(`/assets/${id}/readings`, { params }).then(r => r.data),
  getMaintenance: (id: string) => api.get(`/assets/${id}/maintenance`).then(r => r.data),
}

export const sensorService = {
  list: (params?: Record<string, unknown>) => api.get('/sensors', { params }).then(r => r.data),
  getById: (id: string) => api.get(`/sensors/${id}`).then(r => r.data),
  getReadings: (id: string, params?: Record<string, unknown>) => api.get(`/sensors/${id}/readings`, { params }).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/sensors/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/sensors/${id}`).then(r => r.data),
  updatePosition: (id: string, position: { x: number; y: number; z: number }) => api.put(`/sensors/${id}/position`, position).then(r => r.data),
  removePosition: (id: string) => api.delete(`/sensors/${id}/position`).then(r => r.data),
}

export const workOrderService = {
  list: (params?: Record<string, unknown>) => api.get('/work-orders', { params }).then(r => r.data),
  getStats: () => api.get('/work-orders/stats').then(r => r.data),
  getById: (id: string) => api.get(`/work-orders/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/work-orders', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/work-orders/${id}`, data).then(r => r.data),
  updateStatus: (id: string, status: string) => api.patch(`/work-orders/${id}/status`, { status }).then(r => r.data),
  remove: (id: string) => api.delete(`/work-orders/${id}`).then(r => r.data),
}

export const alertService = {
  getActive: (params?: Record<string, unknown>) => api.get('/alerts/active', { params }).then(r => r.data),
  getHistory: (params?: Record<string, unknown>) => api.get('/alerts/history', { params }).then(r => r.data),
  acknowledge: (id: string) => api.patch(`/alerts/${id}/acknowledge`).then(r => r.data),
  resolve: (id: string) => api.patch(`/alerts/${id}/resolve`).then(r => r.data),
}

export const inspectionService = {
  list: (params?: Record<string, unknown>) => api.get('/inspections', { params }).then(r => r.data),
  getById: (id: string) => api.get(`/inspections/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/inspections', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/inspections/${id}`, data).then(r => r.data),
  complete: (id: string, data: Record<string, unknown>) => api.patch(`/inspections/${id}/complete`, data).then(r => r.data),
  createChecklist: (id: string, data: Record<string, unknown>) => api.post(`/inspections/${id}/checklist`, data).then(r => r.data),
  getChecklists: (id: string) => api.get(`/inspections/${id}/checklist`).then(r => r.data),
  addAnomaly: (id: string, data: Record<string, unknown>) => api.post(`/inspections/${id}/anomalies`, data).then(r => r.data),
  addMedia: (id: string, data: FormData) => api.post(`/inspections/${id}/media`, data, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
}

export const kpiService = {
  getByAsset: (assetId: string) => api.get(`/kpi/${assetId}`).then(r => r.data),
  getDashboard: () => api.get('/kpi/dashboard').then(r => r.data),
  createSnapshot: (data: Record<string, unknown>) => api.post('/kpi', data).then(r => r.data),
  getHistory: (params?: Record<string, unknown>) => api.get('/kpi/history', { params }).then(r => r.data),
}

export const plantService = {
  list: () => api.get('/plants').then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/plants', data).then(r => r.data),
  getById: (id: string) => api.get(`/plants/${id}`).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/plants/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/plants/${id}`).then(r => r.data),
  getAreas: (id: string) => api.get(`/plants/${id}/areas`).then(r => r.data),
}

export const digitalTwinService = {
  list: () => api.get('/digital-twins').then(r => r.data),
  getById: (id: string) => api.get(`/digital-twins/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/digital-twins', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/digital-twins/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/digital-twins/${id}`).then(r => r.data),
  getStatus: (id: string) => api.get(`/digital-twins/${id}/status`).then(r => r.data),
  uploadModel: (id: string, data: FormData) => api.post(`/digital-twins/${id}/model`, data, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
}

export const userService = {
  list: () => api.get('/users').then(r => r.data),
}

export const settingsService = {
  getSystemStatus: () => api.get('/settings/system-status').then(r => r.data),
}

export default api
