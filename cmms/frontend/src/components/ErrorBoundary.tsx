import React, { type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  resetKey?: string
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: undefined })
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <p className="text-sm font-medium text-gray-900">Error al cargar</p>
          <p className="text-xs mt-1">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="btn-secondary mt-4 px-4 py-2 text-xs"
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
