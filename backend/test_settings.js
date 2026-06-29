import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: existing } = await supabase.from('school_settings').select('*').limit(1).single();
  
  if (existing) {
    const { data, error } = await supabase.from('school_settings').update({ youtube_url: 'test', website_url: 'test', facebook_url: 'test' }).eq('id', existing.id);
    console.log("Update result:", error ? error.message : "Success");
  } else {
    console.log("No settings found");
  }
}

test();
