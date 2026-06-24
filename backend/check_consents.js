import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: students } = await supabase.from('user').select('id').eq('type', 'student');

  const { data: consent, error: e1 } = await supabase.from('consents').insert([{
    title: 'School Trip to Museum',
    description: 'Please provide consent for your child to attend the upcoming school trip to the Natural History Museum.',
    class_id: null,
    event_date: '2026-07-15',
    created_by: null
  }]).select().single();
  
  if (consent) {
    const responses = students.map(s => ({
      consent_id: consent.id,
      student_id: s.id,
      status: 'pending'
    }));
    await supabase.from('consent_responses').insert(responses);
    console.log("Created test consent for", responses.length, "students.");
  } else {
    console.log("Error creating consent", e1);
  }
}

check();
