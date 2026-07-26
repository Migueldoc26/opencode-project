import { Mail, AlertCircle } from 'lucide-react'

interface FormInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  autoFocus?: boolean
  id?: string
}

export default function FormInput({ label, value, onChange, placeholder, error, autoFocus, id }: FormInputProps) {
  const inputId = id || 'email'
  const errorId = `${inputId}-error`

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Mail className={`h-4 w-4 ${error ? 'text-red-400' : 'text-gray-500'}`} aria-hidden="true" />
        </div>
        <input
          id={inputId}
          type="email"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="email"
          aria-required="true"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={`w-full rounded-lg border bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500
            transition-colors duration-200 outline-none
            ${error
              ? 'border-red-500 focus:border-red-400 focus:ring-1 focus:ring-red-400/50'
              : 'border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
            }`}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
