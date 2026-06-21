import { useState, useEffect } from 'react'
import {
  Server, Bell, ClipboardList, Activity, AlertTriangle,
  Clock, TrendingUp, Wrench, ArrowUp, ArrowDown,
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { kpiService, workOrderService, alertService, assetService } from '../services/api'

const chartData = [
  { month: 'Jan', mtbf: 320, mttr: 12, availability: 98 },
  { month: 'Feb', mtbf: 340, mttr: 11, availability: 97 },
  { month: 'Mar', mtbf: 310, mttr: 14, availability: 96 },
  { month: 'Apr', mtbf: 360, mttr: 10, availability: 99 },
  { month: 'May', mtbf: 380, mttr: 9, availability: 98 },
  { month: 'Jun', mtbf: 350, mttr: 13, availability: 97 },
]

const alertsData = [
  { id: 1, asset: 'Conveyor Belt A1', type: 'Critical', time: '2 min ago', status: 'active' },
  { id: 2, asset: 'HVAC Unit 3', type: 'Warning', time: '15 min ago', status: 'active' },
  { id: 3, asset: 'Compressor B2', type: 'Info', time: '1h ago', status: 'acknowledged' },
]

const recentOrders = [
  { id: 'WO-001', asset: 'Conveyor Belt A1', status: 'IN_PROGRESS', priority: 'HIGH' },
  { id: 'WO-002', asset: 'Pump Station 2', status: 'PENDING', priority: 'MEDIUM' },
  { id: 'WO-003', asset: 'HVAC Unit 3', status: 'COMPLETED', priority: 'LOW' },
]

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalAssets: 0,
    activeAlerts: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    mtbf: 0,
    mttr: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [assets, alerts, woStats] = await Promise.all([
          assetService.list({ limit: 1 }),
          alertService.getActive(),
          workOrderService.getStats(),
        ])
        setStats({
          totalAssets: assets.total || 0,
          activeAlerts: alerts.length || 0,
          pendingOrders: woStats?.pending || 0,
          inProgressOrders: woStats?.inProgress || 0,
          mtbf: woStats?.mtbf || 0,
          mttr: woStats?.mttr || 0,
        })
      } catch {
        // Use defaults on error
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const statCards = [
    { label: 'Total Assets', value: stats.totalAssets, icon: Server, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Active Alerts', value: stats.activeAlerts, icon: Bell, color: 'text-danger-600', bg: 'bg-danger-50' },
    { label: 'In Progress', value: stats.inProgressOrders, icon: Activity, color: 'text-warning-600', bg: 'bg-warning-50' },
    { label: 'Pending', value: stats.pendingOrders, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'MTBF (h)', value: stats.mtbf, icon: TrendingUp, color: 'text-success-600', bg: 'bg-success-50' },
    { label: 'MTTR (h)', value: stats.mttr, icon: Clock, color: 'text-danger-600', bg: 'bg-danger-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">Real-time maintenance overview</p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map(card => (
          <div key={card.label} className="card flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.bg}`}>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{loading ? '-' : card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* KPI Chart */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="card-title">Maintenance KPIs</h3>
            <select className="input-field w-32 text-xs">
              <option>Last 6 months</option>
              <option>Last year</option>
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="availability" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} name="Availability %" />
                <Line type="monotone" dataKey="mtbf" stroke="#dc2626" strokeWidth={2} name="MTBF (h)" />
                <Line type="monotone" dataKey="mttr" stroke="#f59e0b" strokeWidth={2} name="MTTR (h)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Latest Alerts</h3>
            <Bell className="h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-3">
            {alertsData.map(alert => (
              <div key={alert.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${
                  alert.type === 'Critical' ? 'bg-danger-100 text-danger-600' :
                  alert.type === 'Warning' ? 'bg-warning-100 text-warning-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{alert.asset}</p>
                  <p className="text-xs text-gray-500">{alert.type} - {alert.time}</p>
                  <span className={`badge mt-1 ${
                    alert.status === 'active' ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {alert.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Work Orders & Sensor Readouts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Work Orders */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Work Orders</h3>
            <Wrench className="h-4 w-4 text-gray-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="table-header">ID</th>
                  <th className="table-header">Asset</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{order.id}</td>
                    <td className="table-cell">{order.asset}</td>
                    <td className="table-cell">
                      <span className={`badge ${
                        order.status === 'COMPLETED' ? 'badge-success' :
                        order.status === 'IN_PROGRESS' ? 'badge-warning' :
                        'badge-gray'
                      }`}>{order.status}</span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${
                        order.priority === 'HIGH' ? 'badge-danger' :
                        order.priority === 'MEDIUM' ? 'badge-warning' :
                        'badge-gray'
                      }`}>{order.priority}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sensor Overview */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Real-time Sensor Readouts</h3>
            <Activity className="h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-3">
            {[
              { name: 'Temperature - Reactor A', value: '87.3°C', status: 'normal', change: '+2.1' },
              { name: 'Pressure - Line B', value: '4.2 bar', status: 'warning', change: '+0.8' },
              { name: 'Vibration - Motor C1', value: '2.1 mm/s', status: 'normal', change: '-0.3' },
              { name: 'Flow Rate - Pump 3', value: '142 L/min', status: 'critical', change: '-12' },
            ].map((sensor, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    sensor.status === 'critical' ? 'bg-danger-500 animate-pulse' :
                    sensor.status === 'warning' ? 'bg-warning-500' :
                    'bg-success-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sensor.name}</p>
                    <p className="text-xs text-gray-500">{sensor.value}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${
                  sensor.change.startsWith('+') ? 'text-danger-600' : 'text-success-600'
                }`}>
                  {sensor.change.startsWith('+') ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {sensor.change}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
