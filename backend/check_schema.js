import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || "https://db.thearcschool.in/";
const key = process.env.SUPABASE_ANON_KEY || process.env.ANON_KEY;

async function check() {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { "apikey": key, "Authorization": `Bearer ${key}` }
  });
  const spec = await res.json();
  // OpenAPI 2.0 does not explicitly list constraints, but we can look for "primary key" in the paths or check definitions.
  // We can also try upserting without `onConflict` and see what happens.
  const props = spec.definitions?.attendance?.properties;
  console.log("Attendance columns and descriptions:", props);
}
check().catch(console.error);
