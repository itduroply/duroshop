'use client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface BranchComparisonData {
  branch: string
  requisitions: number
  approvals: number
  dispatches: number
}

interface BranchComparisonBarProps {
  data: BranchComparisonData[]
}

export function BranchComparisonBar({ data }: BranchComparisonBarProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-[#64748B] text-sm">
        No branch data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="branch" tick={{ fontSize: 11, fill: '#64748B' }} />
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
        <Bar dataKey="requisitions" name="Requisitions" fill="#C0392B" radius={[3, 3, 0, 0]} />
        <Bar dataKey="approvals"    name="Approvals"    fill="#27AE60" radius={[3, 3, 0, 0]} />
        <Bar dataKey="dispatches"   name="Dispatches"   fill="#7C3AED" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
