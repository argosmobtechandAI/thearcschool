import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
  const { data: records } = await supabase.from('attendance').select('*').limit(20);
  console.log('Attendance Records:');
  console.log(JSON.stringify(records, null, 2));

  const { data: users } = await supabase.from('user').select('id, name, type').in('id', records.map(r => r.user_id));
  console.log('Matching Users:');
  console.log(JSON.stringify(users, null, 2));
}
check();
