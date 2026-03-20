const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkItems() {
  console.log('Checking items table...\n')
  
  const { data, error, count } = await supabase
    .from('items')
    .select('*', { count: 'exact' })
  
  if (error) {
    console.error('Error fetching items:', error)
    return
  }
  
  console.log(`Total items found: ${count}`)
  console.log('\nItems data:')
  console.log(JSON.stringify(data, null, 2))
}

checkItems()
