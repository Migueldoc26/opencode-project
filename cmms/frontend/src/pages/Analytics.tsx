import { useState } from 'react'
import {
  BarChart3, TrendingUp, PieChart, Calendar,
  Download, RefreshCw,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend,
} from 'recharts'

const mtbfData = [
  { month: 'Jan', mtbf: 320, mttr: 12 },
  { month: 'Feb', mtbf: 340, mttr: 11 },
  { month: 'Mar', mtbf: 310, mttr: 14 },
  { month: 'Apr', mtbf: 360, mttr: 10 },
  { month: 'May', mtbf: 380, mttr: 9 },
  { month: 'Jun', mtbf: 350, mttr: 13 },
  { month: 'Jul', mtbf: 390, mttr: 8 },
  { month: 'Aug', mtbf: 370, mttr: 11 },
]

const availabilityData = [
  { name: 'Operational', value: 94.2 },
  { name: 'Maintenance', value: 3.8 },
  { name: 'Breakdown', value: 2.0 },
]

const COLORS = ['#22c55e', '#f59e0b', '#dc2626']

const completionData = [
  { month: 'Jan', completed: 45, planned: 52 },
  { month: 'Feb', completed: 48, planned: 50 },
  { month: 'Mar', completed: 42, planned: 48 },
  { month: 'Apr', completed: 50, planned: 55 },
  { month: 'May', completed: 55, planned: 58 },
  { month: 'Jun', completed: 48, planned: 50 },
]

const alertTrendData = [
  { month: 'Jan', critical: 5, warning: 12, info: 20 },
  { month: 'Feb', critical: 3, warning: 8, info: 18 },
  { month: 'Mar', critical: 7, warning: 15, info: 22 },
  { month: 'Apr', critical: 4, warning: 10, info: 16 },
  { month: 'May', critical: 2, warning: 6, info: 14 },
  { month: 'Jun', critical: 6, warning: 11, info: 19 },
]

const kpiCards = [
  { label: 'Overall MTBF', value: '352 h', change: '+5.2%', positive: true },
  { label: 'Overall MTTR', value: '11 h', change: '-8.3%', positive: true },
  { label: 'Availability', value: '94.2%', change: '+1.1%', positive: true },
  { label: 'Completion Rate', value: '91.5%', change: '+3.7%', positive: true },
]

export default function Analytics() {
  const [dateRange, setDateRange] = useState('6m')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
          <p className="mt-1 text-sm text-gray-500">Maintenance KPIs and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="input-field w-36 text-sm"
          >
            <option value="1m">Last Month</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last Year</option>
          </select>
          <button className="btn-secondary flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map(kpi => (
          <div key={kpi.label} className="card">
            <p className="text-sm text-gray-500">{kpi.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{kpi.value}</p>
            <p className={`mt-1 text-xs font-medium ${kpi.positive ? 'text-success-600' : 'text-danger-600'}`}>
              {kpi.change}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* MTBF/MTTR Trend */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary-600" />
              MTBF / MTTR Trend
            </h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mtbfData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="mtbf" stroke="#dc2626" strokeWidth={2} name="MTBF (h)" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="mttr" stroke="#f59e0b" strokeWidth={2} name="MTTR (h)" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Asset Availability */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary-600" />
              Asset Availability
            </h3>
          </div>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={availabilityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {availabilityData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Work Order Completion */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary-600" />
              Work Order Completion
            </h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="planned" fill="#e5e7eb" name="Planned" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="#22c55e" name="Completed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alert Trends */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary-600" />
              Alert Trends
            </h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={alertTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="critical" stackId="1" stroke="#dc2626" fill="#dc2626" fillOpacity={0.6} name="Critical" />
                <Area type="monotone" dataKey="warning" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Warning" />
                <Area type="monotone" dataKey="info" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Info" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
