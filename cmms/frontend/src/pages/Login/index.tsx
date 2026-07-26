import { useNavigate } from 'react-router-dom'
import BrandingPanel from './BrandingPanel'
import LoginCard from './LoginCard'

export default function LoginPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen">
      <BrandingPanel />

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-2 bg-[#0f172a] px-4 py-3 lg:hidden border-b border-gray-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/20">
          <svg width="20" height="20" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <polygon points="24,2 44.8,13 44.8,35 24,46 3.2,35 3.2,13" fill="#0f172a" stroke="#dc2626" strokeWidth="1.5" />
            <circle cx="20" cy="22" r="4" fill="#dc2626" />
            <path d="M 14 30 L 12 26 L 18 28 Z" fill="#94a3b8" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-white">CMMS Vision</p>
          <p className="text-[10px] text-gray-500">Industrial Maintenance</p>
        </div>
      </div>

      <LoginCard onSuccess={() => navigate('/')} />

      {/* Mobile footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0f172a]/80 backdrop-blur-md px-4 py-2 text-center lg:hidden border-t border-gray-800">
        <p className="text-[10px] text-gray-600">CMMS Vision v2.0.0 &copy; 2026</p>
      </div>
    </div>
  )
}
