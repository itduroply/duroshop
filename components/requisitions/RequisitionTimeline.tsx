import { Check, Clock, Package, AlertCircle } from 'lucide-react'
import type { Requisition } from '@/types'
import { formatDateTime } from '@/lib/utils'

const allSteps = [
  { key: 'submitted',       label: 'Submitted',      icon: <Clock className="h-3.5 w-3.5" /> },
  { key: 'manager_pending', label: 'Manager Review', icon: <Clock className="h-3.5 w-3.5" /> },
  { key: 'hr_pending',      label: 'HR Review',      icon: <Clock className="h-3.5 w-3.5" /> },
  { key: 'approved',        label: 'Approved',       icon: <Check className="h-3.5 w-3.5" /> },
  { key: 'dispatched',      label: 'Dispatched',     icon: <Package className="h-3.5 w-3.5" /> },
  { key: 'closed',          label: 'Closed',         icon: <Check className="h-3.5 w-3.5" /> },
]

const statusOrder = ['submitted', 'manager_pending', 'hr_pending', 'approved', 'dispatched', 'closed']

interface RequisitionTimelineProps {
  requisition: Requisition
}

export function RequisitionTimeline({ requisition }: RequisitionTimelineProps) {
  const isEmployeePath = requisition.recipient_type === 'employee'
  const visibleSteps = isEmployeePath
    ? allSteps
    : allSteps.filter((s) => s.key !== 'hr_pending')

  const currentIndex = statusOrder.indexOf(requisition.status)
  const isRejected = requisition.status === 'rejected'
  const isVoided = requisition.status === 'voided'

  return (
    <div className="space-y-0">
      {(isRejected || isVoided) && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-[#FEE2E2] p-3 text-sm text-[#DC2626]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {isRejected ? 'This requisition was rejected.' : 'This requisition was automatically voided.'}
          </span>
        </div>
      )}
      <div className="relative">
        {visibleSteps.map((step, i) => {
          const stepIndex = statusOrder.indexOf(step.key)
          const isDone = !isRejected && !isVoided && currentIndex > stepIndex
          const isCurrent = !isRejected && !isVoided && currentIndex === stepIndex
          const approvalStep = requisition.approval_steps?.find(
            (a) =>
              (step.key === 'manager_pending' && a.approver_role === 'manager') ||
              (step.key === 'hr_pending' && a.approver_role === 'hr')
          )
          return (
            <div key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                    isDone
                      ? 'border-[#27AE60] bg-[#27AE60] text-white'
                      : isCurrent
                      ? 'border-[#C0392B] bg-[#C0392B] text-white'
                      : 'border-[#E2E8F0] bg-white text-[#94A3B8]'
                  }`}
                >
                  {step.icon}
                </div>
                {i < visibleSteps.length - 1 && (
                  <div
                    className={`w-0.5 flex-1 min-h-[1.5rem] ${
                      isDone ? 'bg-[#27AE60]' : 'bg-[#E2E8F0]'
                    }`}
                  />
                )}
              </div>
              <div className="pb-4 pt-1">
                <p
                  className={`text-sm font-medium ${
                    isCurrent
                      ? 'text-[#C0392B]'
                      : isDone
                      ? 'text-[#1A1A2E]'
                      : 'text-[#94A3B8]'
                  }`}
                >
                  {step.label}
                </p>
                {approvalStep && (
                  <p className="text-xs text-[#64748B]">
                    {approvalStep.action === 'approved' ? '✓ Approved' : '✗ Rejected'}
                    {approvalStep.remarks && ` — ${approvalStep.remarks}`}
                    <span className="ml-1 text-[#94A3B8]">
                      {formatDateTime(approvalStep.acted_at)}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
