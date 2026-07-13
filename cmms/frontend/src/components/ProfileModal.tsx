import { useState } from 'react'
import { X, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../context/TranslationContext'
import { authService } from '../services/api'

type Tab = 'profile' | 'password'

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { t, lang, setLang } = useTranslation()
  const { user, updateUser } = useAuth()
  const [tab, setTab] = useState<Tab>('profile')

  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changing, setChanging] = useState(false)
  const [pwMsg, setPwMsg] = useState('')

  const handleSaveProfile = async () => {
    setSaving(true)
    setMsg('')
    try {
      await authService.updateProfile({ name, phone })
      updateUser({ name, phone })
      setMsg(t('profile.saved'))
    } catch {
      setMsg(t('profile.error'))
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPwMsg(t('password.mismatch'))
      return
    }
    setChanging(true)
    setPwMsg('')
    try {
      await authService.changePassword({ currentPassword, newPassword })
      setPwMsg(t('password.saved'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      setPwMsg(t('password.error'))
    } finally {
      setChanging(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
              <User className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('profile.title')}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          <button
            onClick={() => setTab('profile')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === 'profile'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {t('profile.title')}
          </button>
          <button
            onClick={() => setTab('password')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === 'password'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {t('password.title')}
          </button>
        </div>

        {tab === 'profile' && (
          <div className="space-y-4">
            <div>
              <label className="label">{t('profile.name')}</label>
              <input
                className="input-field"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t('profile.email')}</label>
              <input
                className="input-field"
                value={user?.email || ''}
                disabled
              />
            </div>
            <div>
              <label className="label">{t('profile.phone')}</label>
              <input
                className="input-field"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+56 9 1234 5678"
              />
            </div>

            {/* Language */}
            <div>
              <label className="label">Idioma / Language</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setLang('es')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    lang === 'es'
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-950/50 dark:text-primary-300'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                >
                  {t('lang.es')}
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    lang === 'en'
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-950/50 dark:text-primary-300'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
                  }`}
                >
                  {t('lang.en')}
                </button>
              </div>
            </div>

            {msg && (
              <p className={`text-sm ${msg.includes('Error') ? 'text-danger-600 dark:text-danger-400' : 'text-success-600 dark:text-success-400'}`}>
                {msg}
              </p>
            )}

            <button onClick={handleSaveProfile} disabled={saving} className="btn-primary w-full">
              {saving ? t('common.loading') : t('profile.save')}
            </button>
          </div>
        )}

        {tab === 'password' && (
          <div className="space-y-4">
            <div>
              <label className="label">{t('password.current')}</label>
              <input
                className="input-field"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t('password.new')}</label>
              <input
                className="input-field"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t('password.confirm')}</label>
              <input
                className="input-field"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>

            {pwMsg && (
              <p className={`text-sm ${pwMsg.includes('Error') || pwMsg.includes('mismatch') ? 'text-danger-600 dark:text-danger-400' : 'text-success-600 dark:text-success-400'}`}>
                {pwMsg}
              </p>
            )}

            <button onClick={handleChangePassword} disabled={changing} className="btn-primary w-full">
              {changing ? t('common.loading') : t('password.save')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
