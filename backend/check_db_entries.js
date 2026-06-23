import dotenv from 'dotenv';
dotenv.config();
import { supabase } from "./src/config/supabaseClient.js";

async function check() {
  const { data: classes } = await supabase.from("class").select("*");
  console.log("CLASSES count:", classes?.length);
  console.log("CLASSES sample:", classes?.slice(0, 10));
  
  const classTeachersCount = classes?.filter(c => c.class_teacher_id).length;
  console.log("Classes with class_teacher_id assigned:", classTeachersCount);
  console.log("Classes with class_teacher_id list:", classes?.filter(c => c.class_teacher_id));

  const { data: classTeachers } = await supabase.from("class_teachers").select("*");
  console.log("CLASS TEACHERS mapping (class_teachers) count:", classTeachers?.length);
  console.log("CLASS TEACHERS mapping sample:", classTeachers?.slice(0, 10));

  const { data: subjects } = await supabase.from("subject").select("*");
  console.log("SUBJECTS count:", subjects?.length);
  console.log("SUBJECTS sample:", subjects?.slice(0, 10));

  const { data: subjectTeachers } = await supabase.from("subject_teachers").select("*");
  console.log("SUBJECT TEACHERS (mapping) count:", subjectTeachers?.length);
  console.log("SUBJECT TEACHERS sample:", subjectTeachers?.slice(0, 10));

  const { data: users } = await supabase.from("user").select("id, name, email, type").eq("type", "teacher");
  console.log("TEACHERS:", users);
}

check().catch(console.error);
