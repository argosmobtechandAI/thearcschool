import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

// Generate admin token
const token = jwt.sign({ id: 'd0bfbcbe-5444-42f2-bd5d-a0e28fcf528d', type: 'admin' }, process.env.JWT_SECRET);

async function testApi() {
  console.log("Testing API endpoint...");
  const res = await fetch('http://localhost:3002/api/attendance/d0bfbcbe-5444-42f2-bd5d-a0e28fcf528d', {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: { date: "2026-06-22", status: "present" } })
  });
  const data = await res.json();
  console.log('API Response:', JSON.stringify(data, null, 2));
}

testApi();
