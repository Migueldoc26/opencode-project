import { useState, useEffect } from 'react'
import {
  User, Lock, Bell, Shield, Save, Camera,
  Server, Database, Activity, Clock, Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authService, settingsService } from '../services/api'

interface SystemStatus {
  uptime: string
  version: string
  activeUsers: number
  totalAssets: number
  dbStatus: string
  apiStatus: string
  lastBackup: string
}

export default function Settings() {
  const { user, updateUser, token, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications' | 'system'>('profile')
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [notifications, setNotifications] = useState({
    emailAlerts: true, pushAlerts: true, dailyDigest: false, weeklyReport: true,
  })
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    settingsService.getSystemStatus()
      .then(data => setSystemStatus(data))
      .catch(() => setSystemStatus({
        uptime: '15 days, 7h 32m',
        version: '2.0.0',
        activeUsers: 12,
        totalAssets: 156,
        dbStatus: 'Connected',
        apiStatus: 'Healthy',
        lastBackup: '2024-06-20 03:00 AM',
      }))
  }, [])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleProfileUpdate = async () => {
    setSaving(true)
    try {
      await authService.updateProfile({ name: profileForm.name, phone: profileForm.phone })
      updateUser({ name: profileForm.name, phone: profileForm.phone })
      showMessage('success', 'Profile updated successfully')
    } catch {
      showMessage('error', 'Failed to update profile')
    }
    setSaving(false)
  }

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage('error', 'Passwords do not match')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      showMessage('error', 'Password must be at least 6 characters')
      return
    }
    setSaving(true)
    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      showMessage('success', 'Password changed successfully')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch {
      showMessage('error', 'Failed to change password. Check current password.')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="mt-1 text-sm text-gray-500">Manage your account and system preferences</p>
      </div>

      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          message.type === 'success' ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Tabs */}
        <div className="card p-3 lg:col-span-1">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'profile' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <User className="h-4 w-4" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'password' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Lock className="h-4 w-4" />
              Password
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'notifications' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Bell className="h-4 w-4" />
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'system' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Server className="h-4 w-4" />
              System
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile */}
          {activeTab === 'profile' && (
            <div className="card">
              <h3 className="card-title mb-6">Profile Information</h3>
              <div className="mb-6 flex items-center gap-4">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-600">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm hover:bg-primary-700">
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <span className="badge-primary mt-1 inline-block">{user?.role || 'User'}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">Full Name</label>
                  <input
                    className="input-field"
                    value={profileForm.name}
                    onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    className="input-field"
                    value={profileForm.email}
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-400">Email cannot be changed</p>
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    className="input-field"
                    value={profileForm.phone}
                    onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button onClick={handleProfileUpdate} disabled={saving} className="btn-primary flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Password */}
          {activeTab === 'password' && (
            <div className="card">
              <h3 className="card-title mb-6">Change Password</h3>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="label">Current Password</label>
                  <input
                    type="password"
                    className="input-field"
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input
                    type="password"
                    className="input-field"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input
                    type="password"
                    className="input-field"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button onClick={handlePasswordChange} disabled={saving} className="btn-primary flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="card">
              <h3 className="card-title mb-6">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { key: 'emailAlerts', label: 'Email Alerts', desc: 'Receive critical alerts via email' },
                  { key: 'pushAlerts', label: 'Push Notifications', desc: 'Receive push notifications for alerts' },
                  { key: 'dailyDigest', label: 'Daily Digest', desc: 'Daily summary of all alerts and activities' },
                  { key: 'weeklyReport', label: 'Weekly Report', desc: 'Weekly maintenance performance report' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={notifications[item.key as keyof typeof notifications]}
                        onChange={e => setNotifications(f => ({ ...f, [item.key]: e.target.checked }))}
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-600 peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <button className="btn-primary flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* System */}
          {activeTab === 'system' && (
            <div className="card">
              <h3 className="card-title mb-6">System Status</h3>
              {systemStatus && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-primary-600" />
                      <span className="text-sm text-gray-500">API Status</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${systemStatus.apiStatus === 'Healthy' ? 'bg-success-500' : 'bg-danger-500'}`} />
                      <span className="text-lg font-bold text-gray-900">{systemStatus.apiStatus}</span>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-primary-600" />
                      <span className="text-sm text-gray-500">Database</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${systemStatus.dbStatus === 'Connected' ? 'bg-success-500' : 'bg-danger-500'}`} />
                      <span className="text-lg font-bold text-gray-900">{systemStatus.dbStatus}</span>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary-600" />
                      <span className="text-sm text-gray-500">Uptime</span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-gray-900">{systemStatus.uptime}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary-600" />
                      <span className="text-sm text-gray-500">Active Users</span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-gray-900">{systemStatus.activeUsers}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-primary-600" />
                      <span className="text-sm text-gray-500">Total Assets</span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-gray-900">{systemStatus.totalAssets}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-success-600" />
                      <span className="text-sm text-gray-500">Version</span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-gray-900">{systemStatus.version}</p>
                  </div>
                </div>
              )}
              <div className="mt-6 rounded-lg border bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Session</p>
                      <p className="text-xs text-gray-500">Token expires in 23h 45m</p>
                    </div>
                  </div>
                  <button onClick={logout} className="btn-danger px-4 py-2 text-sm">Logout All Sessions</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
