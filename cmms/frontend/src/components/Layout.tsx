import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CircuitBoard, Server, Activity, ClipboardList,
  Bell, SearchCheck, BarChart3, Settings, LogOut, Menu, X,
  ChevronLeft, ChevronRight, Wifi, WifiOff, User,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../context/WebSocketContext'
import Logo from './common/Logo'

const navigation = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/digital-twin', icon: CircuitBoard, label: 'Digital Twin' },
  { to: '/assets', icon: Server, label: 'Assets' },
  { to: '/sensors', icon: Activity, label: 'Sensors' },
  { to: '/work-orders', icon: ClipboardList, label: 'Work Orders' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/inspections', icon: SearchCheck, label: 'Inspections' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()
  const { connected } = useWebSocket()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-gray-900 text-white transition-all duration-300 lg:static ${
          collapsed ? 'w-16' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo area */}
        <div className={`flex items-center border-b border-gray-800 px-4 ${collapsed ? 'justify-center py-4' : 'justify-between py-3'}`}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <Logo size={32} />
              <div className="leading-tight">
                <p className="text-sm font-bold text-white">CMMS</p>
                <p className="text-[10px] text-gray-400">Vision</p>
              </div>
            </div>
          )}
          {collapsed && <Logo size={28} />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white lg:block"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {navigation.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : ''}` + (collapsed ? ' justify-center px-2' : '')
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className={`border-t border-gray-800 p-4 ${collapsed ? 'text-center' : ''}`}>
          {collapsed ? (
            <div className="flex justify-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-white">{user?.name || 'User'}</p>
                <p className="truncate text-xs text-gray-400">{user?.email || ''}</p>
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <div className={`border-t border-gray-800 p-4 ${collapsed ? 'text-center' : ''}`}>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 rounded-lg text-sm font-medium text-gray-400 transition-colors hover:text-white ${
              collapsed ? 'justify-center w-full' : 'w-full px-3 py-2 hover:bg-gray-800'
            }`}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">CMMS Vision</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {connected ? (
                <Wifi className="h-4 w-4 text-success-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-danger-500" />
              )}
              <span className="hidden sm:inline">{connected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user?.name || 'User'}</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
