const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', SUPABASE_URL ? 'set' : 'missing');
console.log('Key:', SERVICE_ROLE_KEY ? 'set' : 'missing');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  // Step 1: Create the table
  const { error: createErr } = await supabase.rpc('exec_sql', {
    sql_string: `
      CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
        "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
        "role_id" "uuid" NOT NULL REFERENCES "public"."roles"("id") ON DELETE CASCADE,
        "screen" "text" NOT NULL,
        "has_access" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz DEFAULT now(),
        "updated_at" timestamptz DEFAULT now(),
        UNIQUE ("role_id", "screen")
      );
    `
  });

  if (createErr) {
    console.log('RPC exec_sql not available, trying SQL via Management API...');
    
    // Extract project ref from URL (e.g., https://xxxx.supabase.co -> xxxx)
    const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
    
    // Try using the PostgREST SQL endpoint via service role
    const sqlContent = fs.readFileSync(
      path.join(__dirname, '..', 'supabase', 'migrations', '20260310120000_create_role_permissions.sql'),
      'utf-8'
    );
    
    // Use pg-meta endpoint to execute raw SQL
    const pgResp = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'X-Connection-Encrypted': 'true',
      },
      body: JSON.stringify({ query: sqlContent })
    });
    
    if (pgResp.ok) {
      console.log('Table created via pg query endpoint.');
    } else {
      const pgText = await pgResp.text();
      console.log('pg/query status:', pgResp.status, pgText);
      
      console.log('\n⚠️  Cannot create table programmatically.');
      console.log('Please run the following SQL in your Supabase Dashboard SQL Editor:');
      console.log('File: supabase/migrations/20260310120000_create_role_permissions.sql');
      console.log('\nAfter creating the table, run this script again to seed the data.');
      return;
    }
  } else {
    console.log('Table created successfully via RPC.');
  }

  // Step 2: Seed default permissions
  const { data: roles, error: rolesErr } = await supabase
    .from('roles')
    .select('id, name');
  
  if (rolesErr) {
    console.log('Error fetching roles:', rolesErr.message);
    return;
  }
  
  console.log('Roles:', roles.map(r => r.name).join(', '));
  
  const roleMap = {};
  roles.forEach(r => { roleMap[r.name] = r.id; });

  const screens = [
    'dashboard', 'requisitions', 'approvals', 'inventory',
    'branch-stock', 'dispatches', 'distributions', 'stock-requests',
    'categories', 'branches', 'receivers', 'users',
    'activity-logs', 'permissions'
  ];

  const hrAccess = ['dashboard', 'requisitions', 'approvals', 'distributions', 'activity-logs'];
  const bmAccess = ['dashboard', 'requisitions', 'approvals', 'inventory', 'branch-stock', 'dispatches', 'distributions', 'stock-requests', 'receivers', 'activity-logs'];
  const empAccess = ['dashboard', 'requisitions', 'inventory', 'branch-stock'];

  const rows = [];
  for (const screen of screens) {
    // Super Admin: all access
    if (roleMap['Super Admin']) {
      rows.push({ role_id: roleMap['Super Admin'], screen, has_access: true });
    }
    // HR
    if (roleMap['HR']) {
      rows.push({ role_id: roleMap['HR'], screen, has_access: hrAccess.includes(screen) });
    }
    // Manager
    if (roleMap['Manager']) {
      rows.push({ role_id: roleMap['Manager'], screen, has_access: bmAccess.includes(screen) });
    }
    // Employee
    if (roleMap['Employee']) {
      rows.push({ role_id: roleMap['Employee'], screen, has_access: empAccess.includes(screen) });
    }
  }

  const { error: insertErr } = await supabase
    .from('role_permissions')
    .upsert(rows, { onConflict: 'role_id,screen' });

  if (insertErr) {
    console.log('Error seeding permissions:', insertErr.message);
  } else {
    console.log(`Successfully seeded ${rows.length} permission rows.`);
  }
}

run().catch(console.error);
