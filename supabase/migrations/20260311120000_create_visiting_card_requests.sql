-- Create visiting_card_requests table
CREATE TABLE IF NOT EXISTS "public"."visiting_card_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "requested_by" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "reason" "text" NOT NULL,
    "status" "text" NOT NULL DEFAULT 'pending_rm_approval'
        CHECK (status IN ('pending_rm_approval', 'pending_hr_approval', 'approved', 'rejected')),
    "reporting_manager_id" "uuid" REFERENCES "public"."users"("id"),
    "rm_approved_by" "uuid" REFERENCES "public"."users"("id"),
    "rm_approved_at" timestamptz,
    "hr_approved_by" "uuid" REFERENCES "public"."users"("id"),
    "hr_approved_at" timestamptz,
    "rejected_by" "uuid" REFERENCES "public"."users"("id"),
    "rejected_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now()
);

-- Add visiting-cards and visiting-card-approvals screens to role_permissions
DO $$
DECLARE
    sa_id UUID;
    hr_id UUID;
    bm_id UUID;
    emp_id UUID;
BEGIN
    SELECT id INTO sa_id FROM roles WHERE name = 'Super Admin';
    SELECT id INTO hr_id FROM roles WHERE name = 'HR';
    SELECT id INTO bm_id FROM roles WHERE name = 'Manager';
    SELECT id INTO emp_id FROM roles WHERE name = 'Employee';

    -- Super Admin: access to both screens
    INSERT INTO role_permissions (role_id, screen, has_access)
    VALUES (sa_id, 'visiting-cards', true)
    ON CONFLICT (role_id, screen) DO NOTHING;
    INSERT INTO role_permissions (role_id, screen, has_access)
    VALUES (sa_id, 'visiting-card-approvals', true)
    ON CONFLICT (role_id, screen) DO NOTHING;

    -- HR: can view visiting cards and approve them
    INSERT INTO role_permissions (role_id, screen, has_access)
    VALUES (hr_id, 'visiting-cards', true)
    ON CONFLICT (role_id, screen) DO NOTHING;
    INSERT INTO role_permissions (role_id, screen, has_access)
    VALUES (hr_id, 'visiting-card-approvals', true)
    ON CONFLICT (role_id, screen) DO NOTHING;

    -- Manager: can view visiting cards and approve them
    INSERT INTO role_permissions (role_id, screen, has_access)
    VALUES (bm_id, 'visiting-cards', true)
    ON CONFLICT (role_id, screen) DO NOTHING;
    INSERT INTO role_permissions (role_id, screen, has_access)
    VALUES (bm_id, 'visiting-card-approvals', true)
    ON CONFLICT (role_id, screen) DO NOTHING;

    -- Employee: can apply for visiting cards but not approve
    INSERT INTO role_permissions (role_id, screen, has_access)
    VALUES (emp_id, 'visiting-cards', true)
    ON CONFLICT (role_id, screen) DO NOTHING;
    INSERT INTO role_permissions (role_id, screen, has_access)
    VALUES (emp_id, 'visiting-card-approvals', false)
    ON CONFLICT (role_id, screen) DO NOTHING;
END $$;
