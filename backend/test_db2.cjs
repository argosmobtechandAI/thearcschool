const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
async function run() {
  const { data } = await supabase.from('student_class').select('*, class:class_id(*), user:user_id(*)').limit(1);
  console.log(JSON.stringify(data, null, 2));
}
run();
