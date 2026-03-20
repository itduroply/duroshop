'use client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ConsumptionData } from '@/types'

const BRANCH_COLORS = ['#C0392B', '#2563EB', '#27AE60', '#E67E22', '#7C3AED', '#0891B2', '#DB2777']

interface ConsumptionLineChartProps {
  data: ConsumptionData[]
}

export function ConsumptionLineChart({ data }: ConsumptionLineChartProps) {
  const months = [...new Set(data.map((d) => d.month))].sort()
  const branches = [...new Set(data.map((d) => d.branch_name))]

  const chartData = months.map((month) => {
    const row: Record<string, string | number> = { month }
    branches.forEach((branch) => {
      const found = data.find((d) => d.month === month && d.branch_name === branch)
      row[branch] = found?.quantity ?? 0
    })
    return row
  })

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-[#64748B] text-sm">
        No consumption data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {branches.map((branch, i) => (
          <Line
            key={branch}
            type="monotone"
            dataKey={branch}
            stroke={BRANCH_COLORS[i % BRANCH_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
