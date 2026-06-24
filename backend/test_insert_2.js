import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: adminUser } = await supabase.from('user').select('*').eq('email', 'admin@thearcschool.com').single();
  const { data: teacherUser } = await supabase.from('user').select('*').eq('name', 'ANURADHA JHA').single();

  console.log("Admin ID:", adminUser.id);
  console.log("Teacher ID:", teacherUser?.id);

  const payload = {
    sender_id: adminUser.id,
    receiver_id: teacherUser?.id,
    message: "hi",
    type: "live_chat"
  };

  const { data, error } = await supabase.from('communication').insert([payload]).select();
  console.log("Insert result:", data);
  console.log("Insert error:", error);
}

test();
