import { supabase } from "./src/config/supabaseClient.js";

async function testFull() {
  console.log("Fetching users...");
  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("id, name, admission_number")
    .eq("type", "student");
    
  if (usersError) console.error("Users Error:", usersError);
  console.log("Users fetched:", usersData?.length);

  console.log("Fetching classes...");
  const { data: classesData, error: classError } = await supabase
    .from("class")
    .select("id, name, section");

  if (classError) console.error("Class Error:", classError);
  console.log("Classes fetched:", classesData?.length);
  if (classesData?.length > 0) {
    console.log("Sample class:", classesData[0]);
  }
}

testFull();
