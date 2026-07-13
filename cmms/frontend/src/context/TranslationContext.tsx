import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

const translations = {
  es: {
    // Nav sections
    'nav.monitor': 'Monitor',
    'nav.management': 'Gestion',
    'nav.system': 'Sistema',
    // Nav items
    'nav.dashboard': 'Panel',
    'nav.digital-twin': 'Gemelo Digital',
    'nav.sensors': 'Sensores',
    'nav.assets': 'Activos',
    'nav.work-orders': 'OTs',
    'nav.alerts': 'Alertas',
    'nav.inspections': 'Inspecciones',
    'nav.analytics': 'Analitica',
    'nav.users': 'Usuarios',
    'nav.settings': 'Configuracion',
    // User area
    'user.profile': 'Perfil',
    'user.logout': 'Cerrar Sesion',
    'user.connected': 'Conectado',
    'user.disconnected': 'Desconectado',
    // Theme
    'theme.light': 'Modo Claro',
    'theme.dark': 'Modo Oscuro',
    // Language
    'lang.es': 'Espanol',
    'lang.en': 'English',
    // Profile
    'profile.title': 'Mi Perfil',
    'profile.name': 'Nombre',
    'profile.email': 'Correo',
    'profile.phone': 'Telefono',
    'profile.save': 'Guardar Cambios',
    'profile.saved': 'Perfil actualizado',
    'profile.error': 'Error al actualizar perfil',
    'password.title': 'Cambiar Contrasena',
    'password.current': 'Contrasena Actual',
    'password.new': 'Nueva Contrasena',
    'password.confirm': 'Confirmar Contrasena',
    'password.save': 'Cambiar Contrasena',
    'password.saved': 'Contrasena actualizada',
    'password.error': 'Error al cambiar contrasena',
    'password.mismatch': 'Las contrasenas no coinciden',
    // Common
    'common.cancel': 'Cancelar',
    'common.save': 'Guardar',
    'common.close': 'Cerrar',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    // Users page
    'users.title': 'Usuarios',
    'users.add': 'Agregar Usuario',
    'users.edit': 'Editar Usuario',
    'users.delete': 'Eliminar Usuario',
    'users.name': 'Nombre',
    'users.email': 'Correo',
    'users.role': 'Rol',
    'users.status': 'Estado',
    'users.active': 'Activo',
    'users.inactive': 'Inactivo',
    'users.actions': 'Acciones',
    'users.search': 'Buscar usuarios...',
    'users.confirm-delete': 'Seguro que deseas eliminar este usuario?',
  },
  en: {
    'nav.monitor': 'Monitor',
    'nav.management': 'Management',
    'nav.system': 'System',
    'nav.dashboard': 'Dashboard',
    'nav.digital-twin': 'Digital Twin',
    'nav.sensors': 'Sensors',
    'nav.assets': 'Assets',
    'nav.work-orders': 'Work Orders',
    'nav.alerts': 'Alerts',
    'nav.inspections': 'Inspections',
    'nav.analytics': 'Analytics',
    'nav.users': 'Users',
    'nav.settings': 'Settings',
    'user.profile': 'Profile',
    'user.logout': 'Logout',
    'user.connected': 'Connected',
    'user.disconnected': 'Disconnected',
    'theme.light': 'Light Mode',
    'theme.dark': 'Dark Mode',
    'lang.es': 'Spanish',
    'lang.en': 'English',
    'profile.title': 'My Profile',
    'profile.name': 'Name',
    'profile.email': 'Email',
    'profile.phone': 'Phone',
    'profile.save': 'Save Changes',
    'profile.saved': 'Profile updated',
    'profile.error': 'Error updating profile',
    'password.title': 'Change Password',
    'password.current': 'Current Password',
    'password.new': 'New Password',
    'password.confirm': 'Confirm Password',
    'password.save': 'Change Password',
    'password.saved': 'Password updated',
    'password.error': 'Error changing password',
    'password.mismatch': 'Passwords do not match',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'users.title': 'Users',
    'users.add': 'Add User',
    'users.edit': 'Edit User',
    'users.delete': 'Delete User',
    'users.name': 'Name',
    'users.email': 'Email',
    'users.role': 'Role',
    'users.status': 'Status',
    'users.active': 'Active',
    'users.inactive': 'Inactive',
    'users.actions': 'Actions',
    'users.search': 'Search users...',
    'users.confirm-delete': 'Are you sure you want to delete this user?',
  },
}

type Lang = 'es' | 'en'
type TranslationContextType = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const TranslationContext = createContext<TranslationContextType>(null!)

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('cmms_lang')
    return stored === 'en' || stored === 'es' ? stored : 'es'
  })

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('cmms_lang', l)
  }

  const t = (key: string): string =>
    (translations[lang] as Record<string, string>)[key] || key

  return (
    <TranslationContext.Provider value={{ lang, setLang, t }}>
      {children}
    </TranslationContext.Provider>
  )
}

export const useTranslation = () => useContext(TranslationContext)
