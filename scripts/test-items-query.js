const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQuery() {
  console.log('Testing items query...\n')
  
  // Test 1: Check authentication
  console.log('1. Checking auth status:')
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) {
    console.log('   Auth error:', authError.message)
    console.log('   ⚠️  You need to be logged in to fetch items\n')
  } else if (user) {
    console.log('   ✓ Authenticated as:', user.email, '\n')
  } else {
    console.log('   ⚠️  No authenticated user\n')
  }
  
  // Test 2: Query items table
  console.log('2. Querying items table:')
  const { data, error, count } = await supabase
    .from('items')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
  
  if (error) {
    console.log('   ✗ Error:', error.message)
    console.log('   Code:', error.code)
    console.log('   Details:', error.details, '\n')
  } else {
    console.log(`   ✓ Query successful`)
    console.log(`   Total items: ${count}`)
    if (data && data.length > 0) {
      console.log('\n   Items:')
      data.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.name} (${item.category}) - Qty: ${item.total_qty}`)
      })
    } else {
      console.log('   ⚠️  No items found in database')
    }
  }
}

testQuery()
