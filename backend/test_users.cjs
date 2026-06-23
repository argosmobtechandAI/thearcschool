const jwt = require('jsonwebtoken');
require('dotenv').config();
const token = jwt.sign({id: 'c9a7f6c2-dbc2-4424-9d4a-1ae9f19bf053', email: 'admin@thearcschool.com', type: 'admin'}, process.env.JWT_SECRET);
require('http').get('http://localhost:5001/api/admin_panel/users', {
  headers: { 'Authorization': `Bearer ${token}` }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data.substring(0, 1000)));
});
