import { Building2 } from 'lucide-react'

export default function SSOButton() {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-white/5 py-2.5
        text-sm font-medium text-gray-300 transition-all duration-200
        hover:bg-white/10 hover:text-white active:bg-white/15
        focus:outline-none focus:ring-2 focus:ring-gray-500/50 focus:ring-offset-1 focus:ring-offset-gray-900"
    >
      <Building2 className="h-4 w-4" aria-hidden="true" />
      Inicio de sesión corporativo (SSO)
    </button>
  )
}
