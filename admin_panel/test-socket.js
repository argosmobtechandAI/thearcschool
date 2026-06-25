import { io } from "socket.io-client";

const adminId = "e18145b5-c5ad-4be3-8103-5d527a23188f"; // System Admin
// Let's use a dummy teacher ID, but wait, if it's a dummy, the db insert might fail due to foreign key constraint?
// Let's get Pooja's ID. Wait, I don't know Pooja's ID.
// Let's just create the admin socket, and then insert a message directly into Supabase! The backend uses Supabase realtime? 
// No, the backend uses socket.on("send_message"). If the sender_id doesn't exist, will it fail?
// The backend chatHandler.js does an insert into 'communication'. If it fails foreign key, it won't emit.

// Let's just read the database for Pooja's ID.
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://db.thearcschool.in';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data: teacher } = await supabase.from('user').select('id').eq('type', 'teacher').limit(1).single();
  const teacherId = teacher.id;

  const adminSocket = io("https://api.thearcschool.in");
  const teacherSocket = io("https://api.thearcschool.in");

  adminSocket.on("connect", () => {
    console.log("Admin connected:", adminSocket.id);
    adminSocket.emit("identify", adminId);
  });

  teacherSocket.on("connect", () => {
    console.log("Teacher connected:", teacherSocket.id);
    teacherSocket.emit("identify", teacherId);
    
    // Teacher sends a message after a brief delay
    setTimeout(() => {
      console.log("Teacher sending message...");
      teacherSocket.emit("send_message", {
        sender_id: teacherId,
        receiver_id: adminId,
        message: "Test message from script",
        type: "live_chat"
      });
    }, 1000);
  });

  adminSocket.on("receive_message", (msg) => {
    console.log("ADMIN RECEIVED MESSAGE:", msg.message);
    process.exit(0);
  });

  setTimeout(() => {
    console.log("Timeout! Admin did not receive message in 5 seconds.");
    process.exit(1);
  }, 5000);
}

run();
