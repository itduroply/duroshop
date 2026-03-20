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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Create a service role client for admin access
const supabaseAdmin = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3aXRpZGFkc3RqdndlZG5jaGxiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg4MTQ5NywiZXhwIjoyMDg2NDU3NDk3fQ.BuTWxlGkMUjPCqY2TlqZS9bqv6qBJhqWkJ31bJRTITo'
);

async function getTableStructure() {
  console.log('\n📊 Fetching Actual Database Schema from Supabase\n');
  console.log('='.repeat(70));

  const tables = [
    'user_profiles',
    'branches',
    'inventory_items',
    'branch_stock',
    'stock_requests',
    'receivers',
    'distributions',
    'activity_logs'
  ];

  const schemaInfo = {};

  for (const tableName of tables) {
    try {
      // Try to get one record to infer structure
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`\n❌ ${tableName}: ${error.message}`);
      } else {
        console.log(`\n✅ ${tableName.toUpperCase()}`);
        console.log('-'.repeat(70));

        // If table has data, use it to infer schema
        if (data && data.length > 0) {
          const row = data[0];
          console.log('Columns found (from data):');
          Object.entries(row).forEach(([key, value]) => {
            const type = value === null ? 'unknown' : typeof value;
            console.log(`  • ${key.padEnd(25)} : ${type}`);
          });
          schemaInfo[tableName] = Object.keys(data[0]);
        } else {
          console.log('Table is empty. Trying to detect schema from structure...');
          // For empty tables, try to insert and catch error to see required fields
          const testData = {};
          console.log('  (Table exists but is empty)');
          schemaInfo[tableName] = [];
        }
      }
    } catch (err) {
      console.log(`\n❌ ${tableName}: ${err.message}`);
    }
  }

  // Try to get detailed schema from information_schema if available
  console.log('\n\n' + '='.repeat(70));
  console.log('\n🔍 Attempting to get detailed column information...\n');

  try {
    const { data: columns, error } = await supabase
      .rpc('get_table_information', {
        table_schema: 'public'
      });

    if (error) {
      console.log('Could not fetch from RPC. Using alternative method...\n');
      
      // List all tables
      const { data: tables_data } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');

      if (tables_data) {
        console.log('Tables in public schema:');
        tables_data.forEach(t => console.log(`  • ${t.tablename}`));
      }
    } else if (columns) {
      console.log('Column Information:');
      columns.forEach(col => {
        console.log(`\n${col.table_name}.${col.column_name}`);
        console.log(`  Type: ${col.data_type}`);
        console.log(`  Nullable: ${col.is_nullable}`);
      });
    }
  } catch (err) {
    console.log(`RPC error (expected): ${err.message}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📝 Summary:\n');
  console.log('To get exact column types, please run this SQL in Supabase SQL Editor:');
  console.log('\n```sql');
  console.log('SELECT ');
  console.log('  table_name,');
  console.log('  column_name,');
  console.log('  data_type,');
  console.log('  is_nullable');
  console.log('FROM information_schema.columns');
  console.log("WHERE table_schema = 'public'");
  console.log("ORDER BY table_name, ordinal_position;");
  console.log('```\n');
}

getTableStructure();
