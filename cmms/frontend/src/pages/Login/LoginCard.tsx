import { useState, FormEvent, useEffect } from 'react'
import { AlertCircle, Check } from 'lucide-react'
import TechnologyLogo from './TechnologyLogo'
import FormInput from './FormInput'
import PasswordInput from './PasswordInput'
import PrimaryButton from './PrimaryButton'
import SSOButton from './SSOButton'
import { useAuth } from '../../context/AuthContext'
import { saveRememberedEmail, getRememberedEmail, clearRememberedEmail } from './auth'
import type { FormErrors } from './types'

interface LoginCardProps {
  onSuccess: () => void
}

function validate(email: string, password: string): FormErrors {
  const errors: FormErrors = {}
  if (!email.trim()) errors.email = 'El correo es obligatorio.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Ingresa un correo válido.'
  if (!password) errors.password = 'La contraseña es obligatoria.'
  return errors
}

export default function LoginCard({ onSuccess }: LoginCardProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const { login } = useAuth()

  useEffect(() => {
    const saved = getRememberedEmail()
    if (saved) { setEmail(saved); setRemember(true) }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setNotif(null)
    const v = validate(email, password)
    setErrors(v)
    if (Object.keys(v).length > 0) return

    setLoading(true)
    try {
      await login(email, password)
      if (remember) saveRememberedEmail(email)
      else clearRememberedEmail()
      setNotif({ type: 'success', message: 'Inicio de sesión exitoso. Redirigiendo...' })
      setTimeout(onSuccess, 500)
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Credenciales inválidas. Intenta nuevamente.'
      setNotif({ type: 'error', message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1a1a2e 100%)' }}>
      <div className="w-full max-w-[520px] rounded-2xl border border-gray-800 bg-[#0f172a] p-8 shadow-2xl shadow-black/40 sm:p-10">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <TechnologyLogo size={56} />
          </div>
          <h2 className="text-xl font-semibold text-white">Bienvenido de nuevo</h2>
          <p className="mt-1 text-sm text-gray-400">Inicia sesión para continuar</p>
        </div>

        {notif && (
          <div className={`mb-5 flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
            notif.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`} role="alert">
            {notif.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            {notif.message}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <FormInput label="Correo electrónico" value={email} onChange={setEmail}
            placeholder="admin@cmms.com" error={errors.email} autoFocus />

          <PasswordInput value={password} onChange={setPassword} error={errors.password} />

          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-gray-600 bg-white/5 text-red-600 focus:ring-red-500/50 focus:ring-offset-0" />
              Recordarme
            </label>
            <a href="#" onClick={e => { e.preventDefault(); alert('Función de recuperación próximamente.') }}
              className="text-sm text-red-400 hover:text-red-300 transition-colors">
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <PrimaryButton loading={loading} />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0f172a] px-3 text-gray-500">o continúa con</span>
            </div>
          </div>

          <SSOButton />
        </form>
      </div>
    </div>
  )
}
