import { LogIn } from 'lucide-react'

interface PrimaryButtonProps {
  loading: boolean
  disabled?: boolean
}

export default function PrimaryButton({ loading, disabled }: PrimaryButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className="relative w-full overflow-hidden rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white
        transition-all duration-200 hover:bg-red-500 active:bg-red-700
        disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-red-600
        focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-1 focus:ring-offset-gray-900"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Iniciando sesión...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Iniciar Sesión
        </span>
      )}
    </button>
  )
}
