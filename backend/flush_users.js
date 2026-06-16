import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { 
    auth: { autoRefreshToken: false, persistSession: false } 
});

async function flushData() {
    console.log("Fetching all users from Supabase Auth...");
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    
    if (authError) {
        console.error("Failed to fetch users:", authError);
        return;
    }

    let deletedCount = 0;

    for (let u of authData.users) {
        // Protect the super admin email
        if (u.email === 'admin@thearcschool.com') {
            console.log(`Skipping super admin: ${u.email}`);
            continue;
        }

        console.log(`Deleting user: ${u.email}`);
        await supabaseAdmin.auth.admin.deleteUser(u.id);
        
        // Also ensure they are deleted from public.user (just in case cascade fails)
        await supabaseAdmin.from('user').delete().eq('id', u.id);
        deletedCount++;
    }

    console.log(`\n✅ Flush complete! Deleted ${deletedCount} users.`);
}

flushData();
