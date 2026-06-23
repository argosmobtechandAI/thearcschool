const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('class_students').select('*').limit(1);
  if(error) console.log(error);
  console.log(data);
}
run();
