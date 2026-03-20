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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n🔍 Connecting to Supabase...');
console.log(`URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDatabase() {
  console.log('\n📊 Inspecting Database Schema...\n');
  
  // Try to query information_schema using raw SQL via Supabase REST API
  const query = `
    SELECT 
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (
        'user_profiles', 'branches', 'inventory_items', 
        'branch_stock', 'stock_requests', 'receivers', 
        'distributions', 'activity_logs'
      )
    ORDER BY table_name, ordinal_position;
  `;
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: query 
    });
    
    if (error) {
      console.log('❌ RPC method not available. Using direct HTTP request...\n');
      
      // Alternative: Use fetch to call PostgREST directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: query })
      });
      
      if (!response.ok) {
        console.log('❌ Direct SQL query not available.\n');
        console.log('Analyzing tables by inserting test data...\n');
        await analyzeByInsertion();
      } else {
        const result = await response.json();
        displaySchema(result);
      }
    } else {
      displaySchema(data);
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
    console.log('\nAnalyzing tables structure...\n');
    await analyzeByInsertion();
  }
}

async function analyzeByInsertion() {
  const tables = {
    user_profiles: {
      id: 'uuid',
      email: 'text',
      full_name: 'text',
      role: 'text',
      branch_id: 'uuid',
      created_at: 'timestamp',
      updated_at: 'timestamp'
    },
    branches: {
      id: 'uuid',
      name: 'text',
      code: 'text',
      address: 'text',
      manager_id: 'uuid',
      created_at: 'timestamp',
      updated_at: 'timestamp'
    }
  };
  
  for (const [tableName, expectedCols] of Object.entries(tables)) {
    console.log(`\n📋 ${tableName.toUpperCase()}`);
    console.log('='.repeat(60));
    
    // Try selecting with specific columns
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
      
      // Try to detect missing columns
      for (const [col, type] of Object.entries(expectedCols)) {
        const { error: colError } = await supabase
          .from(tableName)
          .select(col)
          .limit(1);
        
        if (colError) {
          console.log(`  ❌ ${col} - NOT FOUND`);
        } else {
          console.log(`  ✅ ${col} - ${type}`);
        }
      }
    } else {
      console.log('✅ Table accessible');
      console.log('Expected columns:', Object.keys(expectedCols).join(', '));
    }
  }
  
  console.log('\n\n💡 Please visit Supabase Dashboard to see exact schema:');
  console.log('https://supabase.com/dashboard/project/ewitidadstjvwednchlb/editor\n');
}

function displaySchema(data) {
  let currentTable = '';
  
  data.forEach(row => {
    if (row.table_name !== currentTable) {
      currentTable = row.table_name;
      console.log(`\n📋 ${currentTable.toUpperCase()}`);
      console.log('='.repeat(60));
    }
    
    const nullable = row.is_nullable === 'YES' ? '(nullable)' : '(required)';
    const defaultVal = row.column_default ? ` DEFAULT ${row.column_default}` : '';
    console.log(`  ${row.column_name.padEnd(25)} ${row.data_type.padEnd(20)} ${nullable}${defaultVal}`);
  });
}

inspectDatabase();
