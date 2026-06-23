import dotenv from 'dotenv';
dotenv.config();
import { supabase } from "./src/config/supabaseClient.js";

async function testQueries() {
  const userId = "5078be25-7f16-4777-92d5-59b6c0b2aa73";
  console.log("Testing with teacher ID:", userId);

  // 1. Fetch class teacher of
  const { data: classTeacherOf, error: ctoError } = await supabase
    .from("class")
    .select("id, name, section")
    .eq("class_teacher_id", userId);
    
  if (ctoError) console.error("ctoError:", ctoError);
  else console.log("Class Teacher Of:", classTeacherOf);

  // 2. Fetch subject teachers mapping
  const { data: subjectTeachers, error: stError } = await supabase
    .from("subject_teachers")
    .select("id, subject_id, subject(name), class_id, class(name, section)")
    .eq("teacher_id", userId);
    
  if (stError) console.error("stError:", stError);
  else console.log("Subject Teachers Taught:", JSON.stringify(subjectTeachers, null, 2));
}

testQueries().catch(console.error);
