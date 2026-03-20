-- Create role_permissions table for screen-level access control
CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "role_id" "uuid" NOT NULL REFERENCES "public"."roles"("id") ON DELETE CASCADE,
    "screen" "text" NOT NULL,
    "has_access" boolean NOT NULL DEFAULT false,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    UNIQUE ("role_id", "screen")
);

-- Insert default permissions for all roles × screens
-- Super Admin gets access to everything
-- Other roles get sensible defaults

DO $$
DECLARE
    r RECORD;
    screens TEXT[] := ARRAY[
        'dashboard', 'requisitions', 'approvals', 'inventory',
        'branch-stock', 'dispatches', 'distributions', 'stock-requests',
        'categories', 'branches', 'receivers', 'users',
        'activity-logs', 'permissions', 'visiting-cards', 'visiting-card-approvals'
    ];
    s TEXT;
    sa_id UUID;
    hr_id UUID;
    bm_id UUID;
    emp_id UUID;
BEGIN
    SELECT id INTO sa_id FROM roles WHERE name = 'Super Admin';
    SELECT id INTO hr_id FROM roles WHERE name = 'HR';
    SELECT id INTO bm_id FROM roles WHERE name = 'Manager';
    SELECT id INTO emp_id FROM roles WHERE name = 'Employee';

    -- Super Admin: all screens
    FOREACH s IN ARRAY screens LOOP
        INSERT INTO role_permissions (role_id, screen, has_access)
        VALUES (sa_id, s, true)
        ON CONFLICT (role_id, screen) DO NOTHING;
    END LOOP;

    -- HR defaults
    FOREACH s IN ARRAY ARRAY['dashboard', 'requisitions', 'approvals', 'distributions', 'activity-logs'] LOOP
        INSERT INTO role_permissions (role_id, screen, has_access)
        VALUES (hr_id, s, true)
        ON CONFLICT (role_id, screen) DO NOTHING;
    END LOOP;
    FOREACH s IN ARRAY ARRAY['inventory', 'branch-stock', 'dispatches', 'stock-requests', 'categories', 'branches', 'receivers', 'users', 'permissions'] LOOP
        INSERT INTO role_permissions (role_id, screen, has_access)
        VALUES (hr_id, s, false)
        ON CONFLICT (role_id, screen) DO NOTHING;
    END LOOP;

    -- Manager defaults
    FOREACH s IN ARRAY ARRAY['dashboard', 'requisitions', 'approvals', 'inventory', 'branch-stock', 'dispatches', 'distributions', 'stock-requests', 'receivers', 'activity-logs'] LOOP
        INSERT INTO role_permissions (role_id, screen, has_access)
        VALUES (bm_id, s, true)
        ON CONFLICT (role_id, screen) DO NOTHING;
    END LOOP;
    FOREACH s IN ARRAY ARRAY['categories', 'branches', 'users', 'permissions'] LOOP
        INSERT INTO role_permissions (role_id, screen, has_access)
        VALUES (bm_id, s, false)
        ON CONFLICT (role_id, screen) DO NOTHING;
    END LOOP;

    -- Employee defaults
    FOREACH s IN ARRAY ARRAY['dashboard', 'requisitions', 'inventory', 'branch-stock'] LOOP
        INSERT INTO role_permissions (role_id, screen, has_access)
        VALUES (emp_id, s, true)
        ON CONFLICT (role_id, screen) DO NOTHING;
    END LOOP;
    FOREACH s IN ARRAY ARRAY['approvals', 'dispatches', 'distributions', 'stock-requests', 'categories', 'branches', 'receivers', 'users', 'activity-logs', 'permissions'] LOOP
        INSERT INTO role_permissions (role_id, screen, has_access)
        VALUES (emp_id, s, false)
        ON CONFLICT (role_id, screen) DO NOTHING;
    END LOOP;
END $$;
