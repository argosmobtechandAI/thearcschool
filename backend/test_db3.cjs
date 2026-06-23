const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('notifications').select('*, user:user_id(name, email, type, student_class(class:class_id(className:name, section)))').limit(2);
  if (error) console.log(error);
  console.log(JSON.stringify(data, null, 2));
}
run();
