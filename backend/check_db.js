import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkData() {
  const { data: users } = await supabase.from('user').select('email, type, id');
  console.log("Users:", users);

  const { data: notifications } = await supabase.from('notifications').select('*');
  console.log("Notifications:", notifications);
}

checkData();
