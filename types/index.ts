export type UserRole = 'super_admin' | 'branch_admin' | 'employee' | 'manager' | 'hr' | 'dispatch'

export type RequisitionStatus =
  | 'draft'
  | 'submitted'
  | 'manager_pending'
  | 'hr_pending'
  | 'approved'
  | 'dispatched'
  | 'closed'
  | 'rejected'
  | 'voided'

export type RecipientType = 'employee' | 'architect' | 'dealer'
export type ApproverRole = 'manager' | 'hr'
export type AuditAction = 'receive' | 'issue' | 'adjustment'

export interface Branch {
  id: string
  name: string
  region: string | null
  address: string | null
  active: boolean
  created_at: string
}

export interface User {
  id: string
  clerk_user_id: string
  name: string | null
  email: string | null
  role: UserRole
  branch_id: string | null
  active: boolean
  created_at: string
  branch?: Branch
}

export interface Category {
  id: string
  name: string
  created_at: string
}

export interface PopItem {
  id: string
  name: string
  sku: string
  category_id: string | null
  image_url: string | null
  unit: string
  description: string | null
  active: boolean
  created_at: string
  category?: Category
}

export interface Inventory {
  id: string
  branch_id: string
  item_id: string
  available_qty: number
  issued_qty: number
  low_stock_threshold: number
  updated_at: string
  branch?: Branch
  item?: PopItem
}

export interface InventoryAudit {
  id: string
  branch_id: string
  item_id: string
  actor_clerk_id: string
  action: AuditAction
  qty_before: number
  qty_after: number
  reason: string | null
  created_at: string
  branch?: Branch
  item?: PopItem
}

export interface Recipient {
  id: string
  name: string
  type: RecipientType
  branch_id: string | null
  contact: string | null
  active: boolean
  created_at: string
  branch?: Branch
}

export interface Requisition {
  id: string
  requestor_clerk_id: string
  branch_id: string | null
  recipient_type: RecipientType
  reason: string
  status: RequisitionStatus
  auto_void_at: string | null
  created_at: string
  branch?: Branch
  lines?: RequisitionLine[]
  approval_steps?: ApprovalStep[]
  distribution?: Distribution
}

export interface RequisitionLine {
  id: string
  requisition_id: string
  item_id: string
  requested_qty: number
  approved_qty: number | null
  created_at: string
  item?: PopItem
}

export interface ApprovalStep {
  id: string
  requisition_id: string
  approver_role: ApproverRole
  approver_clerk_id: string | null
  action: 'approved' | 'rejected'
  remarks: string | null
  acted_at: string
}

export interface Distribution {
  id: string
  requisition_id: string
  distributor_clerk_id: string
  recipient_id: string
  notes: string | null
  distributed_at: string
  recipient?: Recipient
}

export interface Notification {
  id: string
  user_clerk_id: string
  event_type: string
  message: string
  read: boolean
  created_at: string
}

export interface ActionResult<T = null> {
  success: boolean
  data?: T
  error?: string
}

export interface DashboardKPI {
  label: string
  value: number | string
  change?: number
  trend?: 'up' | 'down' | 'neutral'
}

export interface BranchInventorySummary {
  branch_id: string
  branch_name: string
  total_items: number
  low_stock_count: number
  total_available: number
}

export interface RequisitionSummary {
  status: RequisitionStatus
  count: number
}

export interface ConsumptionData {
  month: string
  branch_name: string
  quantity: number
}

export interface AgingData {
  branch_name: string
  range_0_3: number
  range_4_7: number
  range_8_15: number
  range_over_15: number
}

export interface CartItem {
  item: PopItem & { available_qty: number; low_stock_threshold: number }
  quantity: number
}
