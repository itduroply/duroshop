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

async function seedRoles() {
  console.log('\n🌱 Seeding Roles and Receiver Types...\n');

  // Default roles
  const roles = [
    { name: 'super_admin' },
    { name: 'hr' },
    { name: 'manager' },
    { name: 'inventory_requester' }
  ];

  // Default receiver types
  const receiverTypes = [
    { name: 'employee' },
    { name: 'architect' },
    { name: 'dealer' },
    { name: 'contractor' }
  ];

  try {
    // Insert roles
    console.log('📝 Inserting roles...');
    const { data: rolesData, error: rolesError } = await supabase
      .from('roles')
      .insert(roles);

    if (rolesError) {
      if (rolesError.message.includes('duplicate')) {
        console.log('⚠️  Roles already exist');
      } else {
        console.log('❌ Error inserting roles:', rolesError.message);
      }
    } else {
      console.log('✅ Roles inserted:', rolesData?.length || 0);
    }

    // Insert receiver types
    console.log('\n📝 Inserting receiver types...');
    const { data: typesData, error: typesError } = await supabase
      .from('receiver_types')
      .insert(receiverTypes);

    if (typesError) {
      if (typesError.message.includes('duplicate')) {
        console.log('⚠️  Receiver types already exist');
      } else {
        console.log('❌ Error inserting receiver types:', typesError.message);
      }
    } else {
      console.log('✅ Receiver types inserted:', typesData?.length || 0);
    }

    // Verify
    console.log('\n✅ Verification:');
    const { data: verifyRoles } = await supabase
      .from('roles')
      .select('id, name');
    
    console.log('Roles in database:', verifyRoles?.map(r => r.name).join(', ') || 'None');

    const { data: verifyTypes } = await supabase
      .from('receiver_types')
      .select('id, name');
    
    console.log('Receiver types in database:', verifyTypes?.map(t => t.name).join(', ') || 'None');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

seedRoles();
