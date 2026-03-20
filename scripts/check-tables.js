const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
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

async function checkTables() {
  console.log('\n🔍 Checking Supabase Database Tables...\n');
  
  try {
    // Query the information schema to get all tables
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (error) {
      console.log('❌ Error querying tables:', error.message);
      console.log('\nTrying alternative method...\n');
      
      // Try to query each expected table
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
      
      for (const table of tables) {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          console.log(`✅ ${table} - Found (${count || 0} rows)`);
          
          // Get column info by selecting one row
          const { data: sample } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          if (sample && sample.length > 0) {
            console.log(`   Columns: ${Object.keys(sample[0]).join(', ')}`);
          } else {
            // Try to get columns from empty table
            const { data: cols } = await supabase
              .from(table)
              .select('*')
              .limit(0);
            console.log(`   Table exists but is empty`);
          }
        } else {
          console.log(`❌ ${table} - Not found or no access`);
        }
      }
    } else {
      console.log('📋 Tables found in public schema:');
      data.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkTables();
