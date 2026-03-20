export interface Requisition {
  id: string
  requestNo: string
  employee: {
    name: string
    email: string
  }
  branch: string
  category: string
  status: 'Pending' | 'Approved' | 'In Progress' | 'Rejected'
  requestedDate: string
  agingDays: number
  items: Array<{
    name: string
    sku: string
    quantity: number
    amount: number
  }>
  totalAmount: number
  justification: string
}

export const requisitions: Requisition[] = [
  {
    id: 'REQ-2024-0045',
    requestNo: 'REQ-2024-0045',
    employee: {
      name: 'Michael Chen',
      email: 'michael.chen@duroshop.com',
    },
    branch: 'Branch A',
    category: 'Office Supplies',
    status: 'Pending',
    requestedDate: 'Jan 12, 2024',
    agingDays: 14,
    items: [
      { name: 'A4 Paper Reams', sku: 'OFF-001', quantity: 50, amount: 250 },
      { name: 'Ballpoint Pens (Box)', sku: 'OFF-012', quantity: 20, amount: 80 },
      { name: 'Stapler Heavy Duty', sku: 'OFF-025', quantity: 5, amount: 75 },
    ],
    totalAmount: 405,
    justification: 'Monthly office supplies replenishment for the administrative team. Current stock levels are critically low.',
  },
  {
    id: 'REQ-2024-0044',
    requestNo: 'REQ-2024-0044',
    employee: {
      name: 'Sarah Johnson',
      email: 'sarah.j@duroshop.com',
    },
    branch: 'Branch C',
    category: 'IT Equipment',
    status: 'Approved',
    requestedDate: 'Jan 15, 2024',
    agingDays: 11,
    items: [
      { name: 'Laptop Stand', sku: 'IT-001', quantity: 10, amount: 500 },
    ],
    totalAmount: 500,
    justification: 'Ergonomic setup for new team members.',
  },
  {
    id: 'REQ-2024-0043',
    requestNo: 'REQ-2024-0043',
    employee: {
      name: 'James Wilson',
      email: 'j.wilson@duroshop.com',
    },
    branch: 'Branch B',
    category: 'Furniture',
    status: 'Pending',
    requestedDate: 'Jan 18, 2024',
    agingDays: 8,
    items: [
      { name: 'Office Chair', sku: 'FUR-001', quantity: 5, amount: 750 },
    ],
    totalAmount: 750,
    justification: 'Replacement of damaged office furniture.',
  },
  {
    id: 'REQ-2024-0042',
    requestNo: 'REQ-2024-0042',
    employee: {
      name: 'Emily Davis',
      email: 'emily.d@duroshop.com',
    },
    branch: 'Branch A',
    category: 'Maintenance',
    status: 'In Progress',
    requestedDate: 'Jan 20, 2024',
    agingDays: 6,
    items: [
      { name: 'Cleaning Supplies Bundle', sku: 'MAINT-001', quantity: 2, amount: 200 },
    ],
    totalAmount: 200,
    justification: 'Monthly maintenance supplies.',
  },
  {
    id: 'REQ-2024-0041',
    requestNo: 'REQ-2024-0041',
    employee: {
      name: 'Robert Martinez',
      email: 'r.martinez@duroshop.com',
    },
    branch: 'Branch D',
    category: 'Office Supplies',
    status: 'Rejected',
    requestedDate: 'Jan 22, 2024',
    agingDays: 4,
    items: [
      { name: 'Printer Paper', sku: 'OFF-002', quantity: 100, amount: 300 },
    ],
    totalAmount: 300,
    justification: 'Budget allocation exceeded.',
  },
]
