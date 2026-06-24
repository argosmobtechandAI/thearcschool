import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: adminUser } = await supabase.from('user').select('*').eq('type', 'admin').single();
  const { data: teacherUser } = await supabase.from('user').select('*').eq('type', 'teacher').limit(1).single();

  console.log("Admin:", adminUser.id, typeof adminUser.id);
  console.log("Teacher:", teacherUser.id, typeof teacherUser.id);

  const payload = {
    sender_id: adminUser.id,
    receiver_id: teacherUser.id,
    message: "hi",
    type: "live_chat"
  };

  console.log("Payload:", payload);

  const { data, error } = await supabase.from('communication').insert([payload]).select();
  console.log("Insert result:", data);
  console.log("Insert error:", error);
}

test();
