'use client'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface CategoryData {
  name: string
  value: number
}

interface CategoryPieChartProps {
  data: CategoryData[]
}

const COLORS = [
  '#C0392B', '#2563EB', '#27AE60', '#E67E22',
  '#7C3AED', '#0891B2', '#DB2777', '#D97706',
]

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-[#64748B] text-sm">
        No category data available
      </div>
    )
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              fontSize: 12,
            }}
            formatter={(value: number) => [
              `${value} (${((value / total) * 100).toFixed(1)}%)`,
              'Items',
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <p className="text-2xl font-bold text-[#1A1A2E]">{total}</p>
        <p className="text-xs text-[#64748B]">total</p>
      </div>
    </div>
  )
}
