import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('grades')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching grades:', error);
  } else {
    console.log('Sample Grade columns:', data && data.length > 0 ? Object.keys(data[0]) : 'No data in grades table');
  }
}

run();
