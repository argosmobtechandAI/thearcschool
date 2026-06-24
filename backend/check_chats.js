import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/chandanmallik/projects/thearcschool/backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('communication')
    .select('*')
    .eq('type', 'live_chat')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error(error);
    return;
  }
  
  data.forEach(chat => {
    console.log(`[${chat.created_at}] ID: ${chat.id}`);
    console.log(`  message: ${chat.message}`);
    console.log(`  title: ${chat.title}`);
    console.log(`  firstPerson: ${chat.firstPerson}`);
    console.log(`  secondPerson: ${JSON.stringify(chat.secondPerson)}`);
    console.log(`  sender_id: ${chat.sender_id}`);
    console.log(`  receiver_id: ${chat.receiver_id}`);
    console.log('---');
  });
}

check();
