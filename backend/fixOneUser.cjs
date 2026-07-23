require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixUser(email) {
  console.log(`Fixing user ${email}...`);
  const { data: oldUser, error: oldErr } = await supabaseAdmin.from('user').select('*').eq('email', email).single();
  if (oldErr || !oldUser) {
    console.error('Old user not found', oldErr);
    return;
  }
  const oldId = oldUser.id;
  console.log(`Found old ID: ${oldId}`);
  
  // 1. Rename old email to bypass unique constraint
  console.log('Renaming old email...');
  await supabaseAdmin.from('user').update({ email: email + '.old' }).eq('id', oldId);
  
  // 2. Create Auth User
  console.log('Creating auth user...');
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'password@1',
    email_confirm: true
  });
  if (authErr) {
    console.error('Auth creation failed', authErr);
    // revert
    await supabaseAdmin.from('user').update({ email }).eq('id', oldId);
    return;
  }
  const newId = authData.user.id;
  console.log(`Created auth user, new ID: ${newId}`);
  
  // 3. Migrate foreign keys
  console.log('Migrating foreign keys...');
  const fkeys = [
    { table: 'class_students', column: 'student_id' },
    { table: 'user_connections', column: 'student_id' },
    { table: 'user_connections', column: 'parent_id' },
    { table: 'student_fees', column: 'student_id' },
    { table: 'grades', column: 'student_id' },
    { table: 'attendance', column: 'student_id' },
    { table: 'notifications', column: 'user_id' },
    { table: 'activities', column: 'user_id' },
    { table: 'complaints', column: 'student_id' }
  ];
  for (const fk of fkeys) {
    const { error } = await supabaseAdmin.from(fk.table).update({ [fk.column]: newId }).eq(fk.column, oldId);
    if (error) console.error(`Failed to update ${fk.table}.${fk.column}`, error.message);
  }
  
  // 4. Update new user row with old data
  console.log('Copying data to new user...');
  const newData = { ...oldUser, id: newId, email };
  const { error: copyErr } = await supabaseAdmin.from('user').update(newData).eq('id', newId);
  if (copyErr) console.error('Failed to copy data', copyErr);
  
  // 5. Delete old user row
  console.log('Deleting old user...');
  const { error: delErr } = await supabaseAdmin.from('user').delete().eq('id', oldId);
  if (delErr) console.error('Failed to delete old user', delErr);
  
  console.log(`Fixed user ${email} successfully!`);
}

fixUser('student_230065@thearcschool.in').catch(console.error);
