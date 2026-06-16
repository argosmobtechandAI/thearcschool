import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({path: '/Users/chandanmallik/projects/thearcschool/backend/.env'});
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function testCreate() {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: 'student_230202@thearcschool.in',
    password: 'pass@230202',
    email_confirm: true,
    user_metadata: {
      name: 'Test Student',
      type: 'student'
    }
  });
  console.log('Error:', error);
}
testCreate();
