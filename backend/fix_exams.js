import { pool } from "./src/config/db.js";
const run = async () => {
  try {
    const res = await pool.query("SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE conrelid = 'exams'::regclass");
    console.log(res.rows);
  } catch(e) {
    console.error(e.message);
  }
  process.exit(0);
}
run();
