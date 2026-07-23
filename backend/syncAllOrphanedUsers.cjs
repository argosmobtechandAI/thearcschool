require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncUsers() {
  console.log('Fetching public users...');
  const { data: publicUsers, error: pErr } = await supabaseAdmin.from('user').select('*');
  if (pErr) throw pErr;

  console.log(`Found ${publicUsers.length} users in public schema.`);
  
  let page = 1;
  let hasMore = true;
  const authUserIds = new Set();
  
  while(hasMore) {
    const { data: authData, error: aErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (aErr) throw aErr;
    
    authData.users.forEach(u => authUserIds.add(u.id));
    if (authData.users.length < 1000) hasMore = false;
    page++;
  }
  
  console.log(`Found ${authUserIds.size} users in auth schema.`);
  
  const orphanedUsers = publicUsers.filter(u => !authUserIds.has(u.id));
  console.log(`Found ${orphanedUsers.length} orphaned users. Syncing...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  const fkeys = [
    { table: 'class_students', column: 'student_id' },
    { table: 'user_connections', column: 'student_id' },
    { table: 'user_connections', column: 'parent_id' },
    { table: 'student_fees', column: 'student_id' },
    { table: 'grades', column: 'student_id' },
    { table: 'attendance', column: 'student_id' }, // Maybe user_id
    { table: 'notifications', column: 'user_id' },
    { table: 'activities', column: 'user_id' },
    { table: 'complaints', column: 'student_id' }
  ];
  
  for (const user of orphanedUsers) {
    const oldId = user.id;
    const email = user.email;
    try {
      // 1. Rename old email to bypass unique constraint
      await supabaseAdmin.from('user').update({ email: email + '.old' }).eq('id', oldId);
      
      // 2. Create Auth User
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: 'password@1',
        email_confirm: true
      });
      if (authErr) {
        console.error(`Auth creation failed for ${email}`, authErr.message);
        await supabaseAdmin.from('user').update({ email }).eq('id', oldId);
        errorCount++;
        continue;
      }
      const newId = authData.user.id;
      
      // 3. Migrate foreign keys
      for (const fk of fkeys) {
        await supabaseAdmin.from(fk.table).update({ [fk.column]: newId }).eq(fk.column, oldId);
      }
      
      // 4. Update new user row with old data
      const newData = { ...user, id: newId, email };
      await supabaseAdmin.from('user').update(newData).eq('id', newId);
      
      // 5. Delete old user row
      await supabaseAdmin.from('user').delete().eq('id', oldId);
      
      successCount++;
      if (successCount % 10 === 0) console.log(`Synced ${successCount}/${orphanedUsers.length} users...`);
    } catch (e) {
      console.error(`Failed to sync ${email}:`, e.message);
      errorCount++;
    }
  }
  
  console.log(`Finished syncing. Success: ${successCount}, Errors: ${errorCount}`);
}

syncUsers().catch(console.error);
