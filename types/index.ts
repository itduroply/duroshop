// User and Authentication Types
export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role_id: string;
  branch_id: string | null;
  reporting_manager: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
}

// Branch Types
export interface Branch {
  id: string;
  name: string;
  city: string;
  address: string;
  created_at: string;
}

// Item and Inventory Types
export interface Item {
  id: string;
  name: string;
  category: string;
  unit: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
}

export interface BranchStock {
  id: string;
  branch_id: string;
  item_id: string;
  quantity: number;
}

// Stock Request Types
export interface StockRequest {
  id: string;
  branch_id: string;
  requested_by: string;
  status: string;
  manager_approved_by: string | null;
  dispatched_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockRequestItem {
  id: string;
  stock_request_id: string;
  item_id: string;
  quantity: number;
}

export interface StockTransaction {
  id: string;
  branch_id: string;
  item_id: string;
  quantity_change: number;
  transaction_type: string;
  reference_id: string | null;
  created_by: string;
  created_at: string;
}

// Receiver Types
export interface ReceiverType {
  id: string;
  name: string;
}

export interface Receiver {
  id: string;
  name: string;
  phone: string;
  receiver_type_id: string;
  branch_id: string;
  address: string;
  created_by: string;
  created_at: string;
}

// Distribution Types
export interface DistributionItem {
  id: string;
  distribution_id: string;
  item_id: string;
  quantity: number;
}

export interface Distribution {
  id: string;
  branch_id: string;
  receiver_id: string;
  receiver_type_id: string;
  status: string;
  manager_approved_by: string | null;
  hr_approved_by: string | null;
  issued_by: string | null;
  issued_at: string | null;
  proof_image_url: string | null;
  remarks: string | null;
  created_at: string;
}

// Activity Log Types
export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  module: string;
  reference_id: string | null;
  created_at: string;
}

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Deprecated Types (kept for reference)
export type UserRole = 'super_admin' | 'hr' | 'manager' | 'inventory_requester';
export type RequestStatus = 'pending' | 'manager_approved' | 'hr_approved' | 'dispatched' | 'rejected';
export type DistributionStatus = 'pending' | 'manager_approved' | 'hr_approved' | 'issued' | 'rejected';
