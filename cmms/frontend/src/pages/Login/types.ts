export interface MetricData {
  id: string
  icon: 'activity' | 'trending' | 'signal'
  value: string
  label: string
  color: 'red' | 'green' | 'orange'
}

export interface FormErrors {
  email?: string
  password?: string
}

export interface LoginFormData {
  email: string
  password: string
  remember: boolean
}
