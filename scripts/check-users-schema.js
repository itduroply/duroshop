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

async function checkUsersTable() {
  console.log('\n🔍 Checking Users Table Structure...\n');

  try {
    // Try to insert a test record to see what's required
    const { error } = await supabase
      .from('users')
      .insert({
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Test',
        email: 'test@test.com',
        phone: '',
        is_active: true,
        // Intentionally omit role_id to see if it's required
      });

    if (error) {
      console.log('❌ Insert error:', error.message);
      console.log('\nThis tells us:');
      if (error.message.includes('role_id')) {
        console.log('- role_id is required (NOT NULL)');
        console.log('- We need to set it or make it nullable');
      }
    } else {
      console.log('✅ role_id is optional (can be NULL)');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkUsersTable();
