import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CircuitBoard, Server, Activity, ClipboardList,
  Bell, SearchCheck, BarChart3, Settings, LogOut, Menu,
  ChevronLeft, ChevronRight, Wifi, WifiOff, User, Users,
  Moon, Sun,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../context/WebSocketContext'
import Logo from './common/Logo'

const navSections = [
  {
    label: 'Monitor',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Panel' },
      { to: '/digital-twin', icon: CircuitBoard, label: 'Gemelo Digital' },
      { to: '/sensors', icon: Activity, label: 'Sensores' },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { to: '/assets', icon: Server, label: 'Activos' },
      { to: '/work-orders', icon: ClipboardList, label: 'OTs' },
      { to: '/alerts', icon: Bell, label: 'Alertas' },
      { to: '/inspections', icon: SearchCheck, label: 'Inspecciones' },
      { to: '/analytics', icon: BarChart3, label: 'Analitica' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/users', icon: Users, label: 'Usuarios' },
      { to: '/settings', icon: Settings, label: 'Configuracion' },
    ],
  },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('cmms_sidebar') === 'true')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('cmms_dark') === 'true')
  const { user, logout } = useAuth()
  const { connected } = useWebSocket()
  const navigate = useNavigate()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('cmms_dark', String(dark))
  }, [dark])

  useEffect(() => {
    localStorage.setItem('cmms_sidebar', String(collapsed))
  }, [collapsed])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-950">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-950/35 dark:bg-gray-950/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-200 bg-white text-gray-950 shadow-xl shadow-gray-950/5 transition-all duration-300 lg:static lg:shadow-none dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:shadow-gray-950/50 ${
          collapsed ? 'w-16' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 ${collapsed ? 'justify-center py-4' : 'justify-between py-3'}`}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <Logo size={32} />
              <div className="leading-tight">
                <p className="text-sm font-bold text-gray-950 dark:text-white">CMMS</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">Industrial</p>
              </div>
            </div>
          )}
          {collapsed && <Logo size={28} />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-lg p-1 text-gray-400 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/50 dark:hover:text-primary-400 lg:block"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-5">
          {navSections.map(section => (
            <div key={section.label}>
              {!collapsed && (
                <p className="sidebar-section-title">{section.label}</p>
              )}
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `sidebar-link ${isActive ? 'sidebar-link-active' : ''}` + (collapsed ? ' justify-center px-2 py-2.5' : '')
                    }
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User area */}
        <div className={`border-t border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-900/50 ${collapsed ? 'text-center' : ''}`}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white dark:bg-primary-500">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <button
                onClick={() => setDark(!dark)}
                className="flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/50 dark:hover:text-primary-400"
                title={dark ? 'Modo claro' : 'Modo oscuro'}
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white dark:bg-primary-500">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-gray-950 dark:text-gray-100">{user?.name || 'Usuario'}</p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user?.email || ''}</p>
              </div>
              <button
                onClick={() => setDark(!dark)}
                className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/50 dark:hover:text-primary-400"
                title={dark ? 'Modo claro' : 'Modo oscuro'}
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Logout */}
        <div className={`border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 ${collapsed ? 'text-center' : ''}`}>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 rounded-lg text-sm font-semibold text-gray-500 transition-colors hover:text-danger-600 ${
              collapsed ? 'justify-center w-full' : 'w-full px-3 py-2 hover:bg-danger-50 dark:hover:bg-danger-950/30'
            }`}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Cerrar Sesion</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">CMMS Industrial</h1>
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">v2</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              {connected ? (
                <Wifi className="h-4 w-4 text-success-500 dark:text-success-400" />
              ) : (
                <WifiOff className="h-4 w-4 text-danger-500 dark:text-danger-400" />
              )}
              <span className="hidden sm:inline">{connected ? 'Conectado' : 'Desconectado'}</span>
            </div>
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user?.name || 'Usuario'}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50/60 p-4 dark:bg-gray-950/50 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
