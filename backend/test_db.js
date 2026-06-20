import fs from 'fs';
import supabase from './src/config/supabaseClient.js';

const run = async () => {
  const sql = fs.readFileSync('map_subjects.sql', 'utf8');
  // Supabase JS client doesn't have a generic query execution for raw SQL DDL easily unless using rpc.
  // We can just check if the table exists by doing a select limit 1
  const { data, error } = await supabase.from('class_subjects').select('*').limit(1);
  if (error) {
    console.log("Table does not exist or error:", error.message);
  } else {
    console.log("Table exists:", data);
  }
  process.exit(0);
}
run();
