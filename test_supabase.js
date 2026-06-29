import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/chandanmallik/projects/thearcschool/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing course insert...');
  const { data, error } = await supabase.from('course').insert([{
    title: 'Test Course',
    subject: 'Math',
    class_id: '8da5b7ed-6a38-416d-8ade-5fb0a14f61af',
    chapter: '1',
    duedate: null,
    date: null,
    description: null,
    file_url: null,
    type: 'study_material',
    day: null,
    topics_taught: null,
    unit: null,
    lesson_no: null,
    page_number: null,
    others: null,
    homework: null
  }]);

  console.log('Error:', error);
  console.log('Data:', data);
}

test();
