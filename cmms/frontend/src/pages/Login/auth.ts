export interface AuthResult {
  success: boolean
  message: string
}

export function simulateLogin(email: string, password: string): Promise<AuthResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!email || !password) {
        resolve({ success: false, message: 'Todos los campos son obligatorios.' })
        return
      }
      if (!email.includes('@') || !email.includes('.')) {
        resolve({ success: false, message: 'Ingresa un correo electrónico válido.' })
        return
      }
      if (password.length < 4) {
        resolve({ success: false, message: 'Credenciales inválidas.' })
        return
      }
      resolve({ success: true, message: 'Inicio de sesión exitoso. Redirigiendo...' })
    }, 1500)
  })
}

export function saveRememberedEmail(email: string): void {
  try { localStorage.setItem('cmms_remembered_email', email) } catch {}
}

export function getRememberedEmail(): string {
  try { return localStorage.getItem('cmms_remembered_email') || '' } catch { return '' }
}

export function clearRememberedEmail(): void {
  try { localStorage.removeItem('cmms_remembered_email') } catch {}
}
