import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/common/Logo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed. Please check your credentials.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Logo size={64} />
          </div>
          <h1 className="text-2xl font-bold text-white">CMMS Vision</h1>
          <p className="mt-1 text-sm text-gray-400">Industrial Maintenance Management</p>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-8 backdrop-blur-sm">
          <h2 className="mb-6 text-lg font-semibold text-white">Sign In</h2>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-danger-500/10 px-4 py-3 text-sm text-danger-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label text-gray-300">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field bg-gray-700/50 border-gray-600 text-white placeholder-gray-500"
                placeholder="admin@cmms.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="label text-gray-300">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field bg-gray-700/50 border-gray-600 text-white placeholder-gray-500 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
