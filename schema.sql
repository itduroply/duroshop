-- DuroShop Database Schema
-- Run this entire script in Supabase SQL Editor

-- 1. Branches
create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Users (mirrors Clerk users)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  email text not null,
  full_name text,
  role text not null default 'employee',
  branch_id uuid references branches(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 3. Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- 4. POP Items
create table if not exists pop_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null unique,
  unit text not null default 'pcs',
  category_id uuid references categories(id) on delete set null,
  low_stock_threshold integer not null default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 5. Inventory
create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  item_id uuid not null references pop_items(id) on delete cascade,
  quantity_on_hand integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(branch_id, item_id)
);

-- 6. Inventory Audit
create table if not exists inventory_audit (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  item_id uuid not null references pop_items(id) on delete cascade,
  action text not null, -- 'receive' | 'dispatch' | 'adjust' | 'void'
  quantity_before integer not null,
  quantity_after integer not null,
  notes text,
  performed_by_clerk_id text,
  created_at timestamptz not null default now()
);

-- 7. Recipients
create table if not exists recipients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null, -- 'employee' | 'architect' | 'dealer'
  branch_id uuid references branches(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 8. Requisitions
create table if not exists requisitions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id) on delete set null,
  requested_by_clerk_id text not null,
  recipient_type text not null, -- 'employee' | 'architect' | 'dealer'
  reason text,
  status text not null default 'manager_pending',
  -- status values: manager_pending | hr_pending | approved | rejected | voided | dispatched | closed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Requisition Lines
create table if not exists requisition_lines (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references requisitions(id) on delete cascade,
  item_id uuid not null references pop_items(id) on delete restrict,
  requested_qty integer not null,
  approved_qty integer,
  created_at timestamptz not null default now()
);

-- 10. Approval Steps
create table if not exists approval_steps (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references requisitions(id) on delete cascade,
  approver_role text not null, -- 'manager' | 'hr'
  approver_clerk_id text,
  action text, -- 'approved' | 'rejected'
  remarks text,
  created_at timestamptz not null default now()
);

-- 11. Distributions
create table if not exists distributions (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references requisitions(id) on delete cascade,
  recipient_id uuid references recipients(id) on delete set null,
  dispatched_by_clerk_id text not null,
  notes text,
  dispatched_at timestamptz not null default now()
);

-- 12. Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_clerk_id text not null,
  title text not null,
  body text not null,
  type text not null default 'info', -- 'info' | 'success' | 'warning' | 'error'
  is_read boolean not null default false,
  requisition_id uuid references requisitions(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_requisitions_status on requisitions(status);
create index if not exists idx_requisitions_branch on requisitions(branch_id);
create index if not exists idx_notifications_user on notifications(user_clerk_id, is_read);
create index if not exists idx_inventory_branch on inventory(branch_id);
create index if not exists idx_users_clerk_id on users(clerk_user_id);

-- Enable Realtime for notifications
alter publication supabase_realtime add table notifications;

-- Seed: default categories
insert into categories (name) values
  ('Stationery'),
  ('Branded Merchandise'),
  ('Signage'),
  ('Uniforms'),
  ('Electronics'),
  ('Cleaning Supplies')
on conflict (name) do nothing;
