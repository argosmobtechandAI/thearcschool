import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log("Fetching a sample student...");
  const { data: student, error } = await supabase
    .from('user')
    .select('*')
    .eq('type', 'student')
    .limit(1);
    
  console.log("Student:", student);
  if (error) console.error("Error:", error);
  
  console.log("Fetching a sample class...");
  const { data: cls } = await supabase.from('class').select('*').limit(1);
  console.log("Class:", cls);
  
  console.log("Fetching a sample fee_structure...");
  const { data: fee } = await supabase.from('fee_structures').select('*').limit(1);
  console.log("Fee structure:", fee);
}

inspect();
