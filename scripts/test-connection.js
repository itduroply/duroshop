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

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n🔐 Supabase Connection Test\n');
console.log('='.repeat(60));

// Check URL
console.log('\n✅ URL Found:');
console.log(`   ${url}`);

// Check Key
console.log('\n🔑 API Key Found:');
console.log(`   ${key.substring(0, 30)}...`);

// Analyze key format
if (key.startsWith('sb_publishable_')) {
  console.log('\n⚠️  WARNING: This is a PUBLISHABLE KEY, not an ANON KEY!');
  console.log('   Format: sb_publishable_* (INCORRECT)');
  console.log('\n❌ CONNECTION: BLOCKED');
  console.log('\n💡 Fix: Get the correct anon key from Supabase:');
  console.log('   1. Go to: https://supabase.com/dashboard/project/ewitidadstjvwednchlb/settings/api');
  console.log('   2. Under "Project API keys" find "anon" key (public)');
  console.log('   3. It should start with "eyJ..." (JWT token)');
  console.log('   4. Replace in .env.local\n');
} else if (key.startsWith('eyJ')) {
  console.log('\n✅ Correct ANON KEY format (JWT token)');
  console.log('   Format: eyJ... (CORRECT)');
  
  // Try connection
  const supabase = createClient(url, key);
  
  (async () => {
    try {
      const { data, error } = await supabase.from('branches').select('count', { count: 'exact', head: true });
      
      if (error) {
        console.log('\n❌ Query Error:', error.message);
      } else {
        console.log('\n✅ CONNECTED: Database accessible!');
        console.log('   Tables found and accessible');
      }
    } catch (err) {
      console.log('\n❌ Connection Error:', err.message);
    }
  })();
  
} else {
  console.log('\n❓ Unknown key format:', key.substring(0, 20) + '...');
}

console.log('\n' + '='.repeat(60) + '\n');
