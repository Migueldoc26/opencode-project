import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { WebSocketProvider } from './context/WebSocketContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DigitalTwin from './pages/DigitalTwin'
import Assets from './pages/Assets'
import AssetDetail from './pages/AssetDetail'
import Sensors from './pages/Sensors'
import WorkOrders from './pages/WorkOrders'
import WorkOrderDetail from './pages/WorkOrderDetail'
import Alerts from './pages/Alerts'
import Inspections from './pages/Inspections'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import { type ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route element={<ProtectedRoute><WebSocketProvider><Layout /></WebSocketProvider></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/digital-twin" element={<DigitalTwin />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/assets/:id" element={<AssetDetail />} />
        <Route path="/sensors" element={<Sensors />} />
        <Route path="/work-orders" element={<WorkOrders />} />
        <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/inspections" element={<Inspections />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
