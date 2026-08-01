import { LogIn } from 'lucide-react'
import { ThinkingOrb } from 'thinking-orbs'

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
          <ThinkingOrb state="working" size={20} theme="dark" />
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
