import dotenv from 'dotenv';
dotenv.config();
import { supabase } from "./src/config/supabaseClient.js";
import fs from 'fs';

async function check() {
  const { data: classes } = await supabase.from("class").select("*");
  const { data: classTeachers } = await supabase.from("class_teachers").select("*");
  const { data: subjects } = await supabase.from("subject").select("*");
  const { data: subjectTeachers } = await supabase.from("subject_teachers").select("*");
  
  const result = {
    classes: classes?.map(c => ({ id: c.id, name: c.name, section: c.section, class_teacher_id: c.class_teacher_id })),
    classTeachers,
    subjects: subjects?.map(s => ({ id: s.id, name: s.name, class_id: s.class_id, teacher_id: s.teacher_id })),
    subjectTeachers
  };

  fs.writeFileSync("/Users/chandanmallik/.gemini/antigravity-ide/brain/03f1969e-64ee-4915-9d07-474dd1ee18b5/db_info.json", JSON.stringify(result, null, 2));
  console.log("Success! Written to db_info.json");
}

check().catch(console.error);
