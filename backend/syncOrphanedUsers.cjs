require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncUsers() {
  console.log('Fetching public users...');
  const { data: publicUsers, error: pErr } = await supabaseAdmin.from('user').select('id, email, type, name, phone, gender, dob, status, alternate_number');
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
  
  for (const user of orphanedUsers) {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        id: user.id,
        email: user.email,
        password: 'password@1',
        email_confirm: true,
        user_metadata: {
          name: user.name,
          type: user.type,
          phone: user.phone,
          alternate_number: user.alternate_number,
          gender: user.gender,
          dob: user.dob,
          status: user.status
        }
      });
      if (error) throw error;
      successCount++;
      if (successCount % 50 === 0) console.log(`Synced ${successCount} users...`);
    } catch (e) {
      console.error(`Failed to sync ${user.email}:`, e.message);
      errorCount++;
    }
  }
  
  console.log(`Finished syncing. Success: ${successCount}, Errors: ${errorCount}`);
}

syncUsers().catch(console.error);
