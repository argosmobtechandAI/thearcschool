import { supabase } from './src/config/supabaseClient.js';
async function test() {
  const classId = 'feb63a61-5bd8-4a24-9269-6a5a03a2df42';
  const { data: studentsData } = await supabase.from('class_students').select('student_id, user:student_id (id, name)').eq('class_id', classId);
  console.log("Students:", studentsData?.length);
  const { data: gradesData } = await supabase.from('grades').select('student_id, marks, exams!inner(class_id, marks)').eq('exams.class_id', classId);
  console.log("Grades:", gradesData?.length);
  const { data: attData } = await supabase.from('attendance').select('student_id, status').eq('class_id', classId);
  console.log("Attendance:", attData?.length);
  process.exit(0);
}
test();
