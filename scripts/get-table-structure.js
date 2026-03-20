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

async function getTableStructure() {
  console.log('\n📊 Fetching Table Structure from Supabase...\n');
  
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
  
  const structures = {};
  
  for (const tableName of tables) {
    console.log(`\n📋 ${tableName.toUpperCase()}`);
    console.log('='.repeat(50));
    
    // Query PostgreSQL information_schema directly using RPC or raw SQL
    const { data, error } = await supabase.rpc('get_table_columns', { 
      table_name: tableName 
    });
    
    if (error) {
      // Fallback: Try to infer from empty select
      console.log('Using fallback method to detect columns...');
      
      const { data: sampleData, error: selectError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (selectError) {
        console.log(`❌ Error: ${selectError.message}`);
      } else {
        // Since table is empty, we'll get metadata from error or need to use a different approach
        console.log('Table exists. Need to check Supabase dashboard for column details.');
        console.log('Visit: https://supabase.com/dashboard/project/ewitidadstjvwednchlb/editor');
      }
    }
  }
  
  console.log('\n\n💡 To get complete table structure:');
  console.log('1. Visit: https://supabase.com/dashboard/project/ewitidadstjvwednchlb/editor');
  console.log('2. Click on each table in the left sidebar');
  console.log('3. Share the column names and types with me\n');
}

getTableStructure();
