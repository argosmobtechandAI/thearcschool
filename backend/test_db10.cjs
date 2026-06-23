const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('notifications').update({ type: '{"screen":"test","params":{}}' }).eq('id', '8cf70f64-6f9d-4077-a7ce-6f362018e2d3').select();
  if(error) console.log(error);
  console.log(data);
}
run();
