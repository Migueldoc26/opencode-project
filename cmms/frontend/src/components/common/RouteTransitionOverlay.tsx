import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import LoadingIndicator from './LoadingIndicator'

export default function RouteTransitionOverlay() {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const [firstLoad, setFirstLoad] = useState(true)

  useEffect(() => {
    if (firstLoad) {
      setFirstLoad(false)
      return
    }
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 1200)
    return () => clearTimeout(timer)
  }, [location.pathname])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <LoadingIndicator prominent label="Cargando..." state="searching" />
    </div>
  )
}
