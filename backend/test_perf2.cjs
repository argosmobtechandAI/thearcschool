const http = require('http');

async function test() {
  const loginRes = await fetch('http://localhost:3002/api/shared/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'puja211986srivastav@gmail.com', password: 'password' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  
  const perfRes = await fetch('http://localhost:3002/api/teacher_app/classes/feb63a61-5bd8-4a24-9269-6a5a03a2df42/performance', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const perfData = await perfRes.json();
  console.log(JSON.stringify(perfData, null, 2));
}
test();
