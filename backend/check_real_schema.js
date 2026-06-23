import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || "https://db.thearcschool.in";
const key = process.env.SUPABASE_ANON_KEY;

async function check() {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { "apikey": key, "Authorization": `Bearer ${key}` }
  });
  const spec = await res.json();
  
  console.log("TABLES:");
  for (const name of Object.keys(spec.definitions || {})) {
    const table = spec.definitions[name];
    console.log(`\nTable: ${name}`);
    console.log("Columns:", Object.keys(table.properties || {}));
  }
}
check().catch(console.error);
