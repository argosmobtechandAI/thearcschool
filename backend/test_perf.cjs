const http = require('http');
http.get('http://localhost:3002/api/teacher_app/classes/feb63a61-5bd8-4a24-9269-6a5a03a2df42/performance', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'DATA:', data.substring(0, 500)));
});
