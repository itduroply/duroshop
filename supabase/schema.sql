-- Duroshop Database Schema
-- This file contains the SQL schema for the Supabase database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles Table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'hr', 'manager', 'inventory_requester')),
  branch_id UUID REFERENCES branches(id),
  reporting_manager UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Branches Table
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL,
  manager_id UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Items Table
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sku TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Branch Stock Table
CREATE TABLE branch_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(branch_id, item_id)
);

-- Stock Requests Table (Branch to HO)
CREATE TABLE stock_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  requested_quantity INTEGER NOT NULL,
  approved_quantity INTEGER,
  status TEXT NOT NULL CHECK (status IN ('pending', 'manager_approved', 'dispatched', 'rejected')),
  requester_id UUID NOT NULL REFERENCES user_profiles(id),
  manager_approval_by UUID REFERENCES user_profiles(id),
  manager_approval_at TIMESTAMP WITH TIME ZONE,
  dispatched_by UUID REFERENCES user_profiles(id),
  dispatched_at TIMESTAMP WITH TIME ZONE,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Receivers Table
CREATE TABLE receivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('employee', 'architect', 'dealer', 'contractor')),
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Distributions Table (Branch to Receiver)
CREATE TABLE distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  receiver_id UUID NOT NULL REFERENCES receivers(id),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  quantity INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'manager_approved', 'hr_approved', 'issued', 'rejected')),
  requester_id UUID NOT NULL REFERENCES user_profiles(id),
  manager_approval_by UUID REFERENCES user_profiles(id),
  manager_approval_at TIMESTAMP WITH TIME ZONE,
  hr_approval_by UUID REFERENCES user_profiles(id),
  hr_approval_at TIMESTAMP WITH TIME ZONE,
  issued_by UUID REFERENCES user_profiles(id),
  issued_at TIMESTAMP WITH TIME ZONE,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity Logs Table
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_user_profiles_branch ON user_profiles(branch_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_branch_stock_branch ON branch_stock(branch_id);
CREATE INDEX idx_branch_stock_item ON branch_stock(item_id);
CREATE INDEX idx_stock_requests_branch ON stock_requests(branch_id);
CREATE INDEX idx_stock_requests_status ON stock_requests(status);
CREATE INDEX idx_distributions_branch ON distributions(branch_id);
CREATE INDEX idx_distributions_status ON distributions(status);
CREATE INDEX idx_distributions_receiver ON distributions(receiver_id);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branch_stock_updated_at BEFORE UPDATE ON branch_stock
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_requests_updated_at BEFORE UPDATE ON stock_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_distributions_updated_at BEFORE UPDATE ON distributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can read their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Branches: All authenticated users can view branches
CREATE POLICY "Authenticated users can view branches" ON branches
  FOR SELECT TO authenticated USING (true);

-- Inventory Items: All authenticated users can view items
CREATE POLICY "Authenticated users can view inventory" ON inventory_items
  FOR SELECT TO authenticated USING (true);

-- Branch Stock: Users can view stock for their branch
CREATE POLICY "Users can view own branch stock" ON branch_stock
  FOR SELECT TO authenticated USING (
    branch_id IN (SELECT branch_id FROM user_profiles WHERE id = auth.uid())
  );

-- Stock Requests: Users can view requests for their branch
CREATE POLICY "Users can view own branch requests" ON stock_requests
  FOR SELECT TO authenticated USING (
    branch_id IN (SELECT branch_id FROM user_profiles WHERE id = auth.uid())
    OR requester_id = auth.uid()
  );

-- Receivers: All authenticated users can view receivers
CREATE POLICY "Authenticated users can view receivers" ON receivers
  FOR SELECT TO authenticated USING (true);

-- Distributions: Users can view distributions for their branch
CREATE POLICY "Users can view own branch distributions" ON distributions
  FOR SELECT TO authenticated USING (
    branch_id IN (SELECT branch_id FROM user_profiles WHERE id = auth.uid())
    OR requester_id = auth.uid()
  );

-- Activity Logs: Users can view their own activity logs
CREATE POLICY "Users can view own activity" ON activity_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid());
