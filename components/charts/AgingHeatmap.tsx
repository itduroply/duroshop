'use client'
import type { AgingData } from '@/types'

interface AgingHeatmapProps {
  data: AgingData[]
}

function getHeatColor(value: number, max: number): string {
  if (max === 0 || value === 0) return '#F8FAFC'
  const intensity = value / max
  if (intensity > 0.66) return '#FEE2E2'
  if (intensity > 0.33) return '#FEF3C7'
  return '#DCFCE7'
}

function getTextColor(value: number, max: number): string {
  if (max === 0 || value === 0) return '#94A3B8'
  const intensity = value / max
  if (intensity > 0.66) return '#DC2626'
  if (intensity > 0.33) return '#D97706'
  return '#16A34A'
}

const buckets: { key: keyof AgingData; label: string }[] = [
  { key: 'range_0_3',    label: '0–3 days' },
  { key: 'range_4_7',    label: '4–7 days' },
  { key: 'range_8_15',   label: '8–15 days' },
  { key: 'range_over_15',label: '>15 days' },
]

export function AgingHeatmap({ data }: AgingHeatmapProps) {
  const allValues = data.flatMap((d) => buckets.map((b) => d[b.key] as number))
  const maxValue = Math.max(...allValues, 1)

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-[#64748B] text-sm">
        No aging data available
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="pb-3 pr-4 text-left text-xs font-medium text-[#64748B]">Branch</th>
            {buckets.map((b) => (
              <th
                key={b.key as string}
                className="pb-3 px-2 text-center text-xs font-medium text-[#64748B]"
              >
                {b.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.branch_name} className="border-t border-[#E2E8F0]">
              <td className="py-2 pr-4 text-sm font-medium text-[#1A1A2E] whitespace-nowrap">
                {row.branch_name}
              </td>
              {buckets.map((b) => {
                const value = row[b.key] as number
                return (
                  <td key={b.key as string} className="px-2 py-2 text-center">
                    <div
                      className="inline-flex h-8 min-w-[3rem] items-center justify-center rounded-md px-2 text-xs font-semibold"
                      style={{
                        backgroundColor: getHeatColor(value, maxValue),
                        color: getTextColor(value, maxValue),
                      }}
                    >
                      {value}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
