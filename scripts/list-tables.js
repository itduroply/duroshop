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

async function listTables() {
  console.log('\n📋 Querying all accessible tables...\n');

  // List of tables to check
  const tableNames = [
    'user_profiles',
    'branches',
    'inventory_items',
    'branch_stock',
    'stock_requests',
    'receivers',
    'distributions',
    'activity_logs'
  ];

  const results = {
    accessible: [],
    inaccessible: []
  };

  for (const tableName of tableNames) {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      results.inaccessible.push({ table: tableName, error: error.message });
      console.log(`❌ ${tableName}`);
      console.log(`   Error: ${error.message}\n`);
    } else {
      results.accessible.push({ table: tableName, count });
      console.log(`✅ ${tableName}`);
      console.log(`   Rows: ${count || 0}\n`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\nSUMMARY:');
  console.log(`Accessible Tables: ${results.accessible.length}`);
  results.accessible.forEach(r => console.log(`  ✅ ${r.table}`));
  
  if (results.inaccessible.length > 0) {
    console.log(`\nInaccessible Tables (RLS Policy Issue): ${results.inaccessible.length}`);
    results.inaccessible.forEach(r => {
      console.log(`  ❌ ${r.table}`);
      if (r.error.includes('schema cache')) {
        console.log(`     → Likely missing RLS policy or table doesn't exist`);
      }
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n💡 ACTION REQUIRED:');
  console.log('Please share the schema details from your Supabase dashboard:');
  console.log('1. Go to: https://supabase.com/dashboard/project/ewitidadstjvwednchlb/editor');
  console.log('2. For each table, note the column names');
  console.log('3. Share with me the columns for these tables:\n');
  
  results.inaccessible.forEach(r => {
    console.log(`   - ${r.table}`);
  });
  
  if (results.accessible.length > 0) {
    console.log('\nOR run this SQL in the SQL Editor:\n');
    console.log('```sql');
    console.log('SELECT');
    console.log('  table_name,');
    console.log('  string_agg(column_name, \', \' ORDER BY ordinal_position) as columns,');
    console.log('  string_agg(data_type, \', \' ORDER BY ordinal_position) as types');
    console.log('FROM information_schema.columns');
    console.log("WHERE table_schema = 'public'");
    console.log('GROUP BY table_name');
    console.log("ORDER BY table_name;");
    console.log('```\n');
  }
}

listTables();
