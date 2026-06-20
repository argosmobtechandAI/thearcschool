import { supabase, supabaseAdmin } from "../../../config/supabaseClient.js";
import { calculateStudentScore } from "../../../utils/helpers.js";

export class UserService {
  static parseSafeDate(dateString) {
    if (!dateString) return null;
    
    // Check if it's an Excel serial date (e.g., "44760")
    if (/^\d{4,5}$/.test(String(dateString))) {
      const excelEpoch = new Date(1899, 11, 30);
      const days = parseInt(dateString, 10);
      let d = new Date(excelEpoch.getTime() + days * 86400000);
      return d.toISOString().split('T')[0];
    }

    let d = new Date(dateString);
    if (isNaN(d.getTime()) && String(dateString).includes('/')) {
      const parts = String(dateString).split('/');
      if (parts.length === 3) {
        // DD/MM/YYYY
        d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
    
    if (isNaN(d.getTime())) return null;
    
    // Sanity check: Ensure year is realistic
    const year = d.getFullYear();
    if (year < 1900 || year > 2100) return null;
    
    return d.toISOString().split('T')[0];
  }

  static async createUser(data) {
    const { connections, classId, classes, ...userData } = data;

    if (data.type === 'parent') {
      let father_name = data.name || '';
      let mother_name = '';
      if (father_name.includes('&')) {
        [father_name, mother_name] = father_name.split('&').map(s => s.trim());
      }
      
      const { data: parentData, error } = await supabase.from('parents').insert({
        father_name,
        mother_name,
        phone: data.phone || null,
        alternate_number: data.alternate_number || null,
      }).select().single();
      
      if (error) throw error;
      
      if (connections && connections.length > 0) {
        const studentParents = connections.map(studentId => ({
          parent_id: parentData.id,
          student_id: studentId
        }));
        await supabase.from('student_parents').insert(studentParents);
      }
      return { user: { ...parentData, type: 'parent' } };
    }

    if (!supabaseAdmin) {
      throw new Error("Supabase Admin client not initialized. Ensure SERVICE_ROLE_KEY is set in .env");
    }

    // Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        name: userData.name,
        type: userData.type || 'student',
        phone: userData.phone || null,
        gender: userData.gender || null,
        dob: userData.dob || null,
        status: userData.status || 'active'
      }
    });

    if (authError || !authData?.user) {
      throw authError || new Error("User creation failed");
    }

    const newUserId = authData.user.id;

    // Handle connections (Parent-Student) using the new UUID
    if (connections?.length > 0) {
      const connectionInserts = connections.map((connectedId) => {
        if (userData.type === 'parent') {
          return { parent_id: newUserId, student_id: connectedId };
        } else {
          return { parent_id: connectedId, student_id: newUserId };
        }
      });
      await supabase.from("user_connections").insert(connectionInserts);
    }

    // Handle new student schema fields
    if (userData.type === 'student') {
      const studentFields = {
        admission_number: data.admission_number,
        house: data.house,
        father_name: data.father_name,
        mother_name: data.mother_name,
        monthly_fee: data.monthly_fee || 0,
        bus_fee: data.bus_fee || 0,
        fee_exempted: data.fee_exempted || false,
        admission_date: data.admission_date,
        form_submitted: data.form_submitted || false,
        address: data.address,
        leave_school: data.leave_school || false,
        tc_received: data.tc_received || false,
        tc_date: data.tc_date,
        slc_received: data.slc_received || false,
        slc_date: data.slc_date,
        character_certificate_received: data.character_certificate_received || false,
        character_certificate_date: data.character_certificate_date,
        tc_document_url: data.tc_document_url,
        slc_document_url: data.slc_document_url,
        character_certificate_document_url: data.character_certificate_document_url
      };
      // Clean up undefined/null values so we don't override defaults
      Object.keys(studentFields).forEach(key => (studentFields[key] === undefined || studentFields[key] === '') && delete studentFields[key]);
      
      if (Object.keys(studentFields).length > 0) {
        await supabase.from("user").update(studentFields).eq("id", newUserId);
      }
    } else if (userData.type === 'teacher') {
      const teacherDetails = {
        user_id: newUserId,
        doj: UserService.parseSafeDate(data.doj) || data.doj,
        father_spouse_name: data.father_spouse_name
      };
      
      const commonFields = { address: data.address, dob: data.dob };
      Object.keys(commonFields).forEach(key => (commonFields[key] === undefined || commonFields[key] === '') && delete commonFields[key]);
      if (Object.keys(commonFields).length > 0) {
        await supabase.from("user").update(commonFields).eq("id", newUserId);
      }
      
      Object.keys(teacherDetails).forEach(key => (teacherDetails[key] === undefined || teacherDetails[key] === '') && delete teacherDetails[key]);
      if (Object.keys(teacherDetails).length > 1) {
        await supabase.from("teacher_details").insert([teacherDetails]);
      }
    } else if (['admin', 'admission', 'finance', 'principal'].includes(userData.type)) {
      // Insert common fields for staff
      const commonFields = { address: data.address, dob: data.dob };
      Object.keys(commonFields).forEach(key => (commonFields[key] === undefined || commonFields[key] === '') && delete commonFields[key]);
      if (Object.keys(commonFields).length > 0) {
        await supabase.from("user").update(commonFields).eq("id", newUserId);
      }
      
      const staffDetails = {
        user_id: newUserId,
        access_level: userData.type,
        job_title: data.job_title || userData.type,
      };
      await supabase.from("staff_details").insert([staffDetails]);
    }

    // Handle student mapping
    if (userData.type === 'student' && classId) {
      await supabase.from("class_students").insert([{ class_id: classId, student_id: newUserId }]);
    }
    // Handle teacher mapping
    if (userData.type === 'teacher' && classes?.length > 0) {
      const teacherInserts = classes.map(cId => ({ class_id: cId, teacher_id: newUserId }));
      await supabase.from("class_teachers").insert(teacherInserts);
    }

    return { id: newUserId, ...userData };
  }

  static async loginUser(email, password) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      throw new Error(authError.message);
    }

    // After successful auth, fetch the public profile
    const { data: user, error: userError } = await supabase
      .from("user")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (userError || !user) {
      throw new Error("User profile not found in public schema");
    }

    return {
      ...user,
      access_token: authData.session.access_token,
      session: authData.session
    };
  }

  static async updateUser(data) {
    if (data.type === 'parent') {
      const parentId = data.id;
      let father_name = data.name || '';
      let mother_name = '';
      if (father_name.includes('&')) {
        [father_name, mother_name] = father_name.split('&').map(s => s.trim());
      }
      
      const { error } = await supabase.from('parents').update({
        father_name,
        mother_name,
        phone: data.phone || null,
        alternate_number: data.alternate_number || null,
      }).eq("id", parentId);
      
      if (error) throw error;
      
      if (data.connections !== undefined) {
        await supabase.from("student_parents").delete().eq("parent_id", parentId);
        if (data.connections.length > 0) {
          const studentParents = data.connections.map(studentId => ({
            parent_id: parentId,
            student_id: studentId
          }));
          await supabase.from("student_parents").insert(studentParents);
        }
      }
      return { success: true };
    }

    const { data: existingUser, error: existingError } = await supabase
      .from("user")
      .select("*")
      .eq("id", data.id);

    if (existingError) throw existingError;
    if (!existingUser || existingUser.length === 0) {
      throw new Error("User not found");
    }

    const userId = data.id;

    if (data.password && data.password !== "") {
      if (!supabaseAdmin) throw new Error("Supabase Admin client missing for password updates.");
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: data.password
      });
      if (authError) throw authError;
    }
    
    delete data.password;
    delete data.id;
    delete data.createdAt;

    const connections = data.connections;
    const classId = data.classId;
    const classes = data.classes;
    
    let teacherDetailsData = null;
    if (existingUser[0].type === 'teacher') {
      teacherDetailsData = {
        doj: data.doj ? UserService.parseSafeDate(data.doj) : undefined,
        father_spouse_name: data.father_spouse_name
      };
      Object.keys(teacherDetailsData).forEach(k => teacherDetailsData[k] === undefined && delete teacherDetailsData[k]);
    }

    delete data.doj;
    delete data.father_spouse_name;

    delete data.connections;
    delete data.classId;
    delete data.classes;

    // Convert any empty strings to null (important for date fields to avoid syntax errors)
    Object.keys(data).forEach(key => {
      if (data[key] === "") {
        data[key] = null;
      }
    });

    const { error: updateError } = await supabase
      .from("user")
      .update(data)
      .eq("id", userId);

    if (updateError) throw updateError;

    const userType = existingUser[0].type;

    if (connections !== undefined && userType === 'parent') {
      await supabase.from("user_connections").delete().eq("parent_id", userId);
      if (connections.length > 0) {
        const connectionInserts = connections.map(studentId => ({ parent_id: userId, student_id: studentId }));
        await supabase.from("user_connections").insert(connectionInserts);
      }
    }

    if (classId !== undefined && userType === 'student') {
      await supabase.from("class_students").delete().eq("student_id", userId);
      if (classId) {
        await supabase.from("class_students").insert([{ class_id: classId, student_id: userId }]);
      }
    }

    if (classes !== undefined && userType === 'teacher') {
      await supabase.from("class_teachers").delete().eq("teacher_id", userId);
      if (classes.length > 0) {
        const teacherInserts = classes.map(cId => ({ class_id: cId, teacher_id: userId }));
        await supabase.from("class_teachers").insert(teacherInserts);
      }
    }

    if (userType === 'teacher' && teacherDetailsData && Object.keys(teacherDetailsData).length > 0) {
      const { data: td } = await supabase.from("teacher_details").select("*").eq("user_id", userId).single();
      if (td) {
        await supabase.from("teacher_details").update(teacherDetailsData).eq("user_id", userId);
      } else {
        await supabase.from("teacher_details").insert([{ user_id: userId, ...teacherDetailsData }]);
      }
    }

    if (data.type && ['admission', 'finance', 'admin', 'principal'].includes(data.type)) {
      const { data: sd } = await supabase.from("staff_details").select("*").eq("user_id", userId).single();
      if (sd) {
        await supabase.from("staff_details").update({ access_level: data.type }).eq("user_id", userId);
      } else {
        await supabase.from("staff_details").insert([{ user_id: userId, access_level: data.type }]);
      }
    }

    return true;
  }

  static async getUsers() {
    // Fetch users (base data only - no relationship joins to avoid schema cache issues)
    const { data: users, error } = await supabase.from("user").select("*");
    if (error) throw error;

    // Fetch all related data in separate parallel queries
    const [
      { data: gradesData },
      { data: notificationsData },
      { data: activitiesData },
      { data: classStudentsData },
      { data: classTeachersData },
      { data: teacherDetailsData },
      { data: connectionsData },
      { data: parentsData },
      { data: studentParentsData }
    ] = await Promise.all([
      supabase.from("grades").select("*"),
      supabase.from("notifications").select("*"),
      supabase.from("activities").select("*"),
      supabase.from("class_students").select("*"),
      supabase.from("class_teachers").select("*"),
      supabase.from("teacher_details").select("*"),
      supabase.from("user_connections").select("*"),
      supabase.from("parents").select("*").then(res => res.error ? { data: [] } : res).catch(() => ({ data: [] })),
      supabase.from("student_parents").select("*").then(res => res.error ? { data: [] } : res).catch(() => ({ data: [] }))
    ]);
    
    const mappedUsers = users.map(user => {
      let connections = [];
      if (user.type === 'student') {
        if (connectionsData) connections = connections.concat(connectionsData.filter(c => c.student_id === user.id).map(c => c.parent_id));
        if (studentParentsData) connections = connections.concat(studentParentsData.filter(c => c.student_id === user.id).map(c => c.parent_id));
      } else if (user.type === 'parent') {
        if (connectionsData) connections = connections.concat(connectionsData.filter(c => c.parent_id === user.id).map(c => c.student_id));
      }
      let classes = [];
      if (user.type === 'student') {
        classes = (classStudentsData || []).filter(c => c.student_id === user.id).map(c => c.class_id);
      } else if (user.type === 'teacher') {
        classes = (classTeachersData || []).filter(c => c.teacher_id === user.id).map(c => c.class_id);
      }

      const u = {
        ...user,
        connections,
        classes,
        grade: (gradesData || []).filter(g => g.student_id === user.id),
        fees: [], // Virtual Ledger: Fees are calculated dynamically on the finance panel
        notification: (notificationsData || []).filter(n => n.user_id === user.id),
        activity: (activitiesData || []).filter(a => a.user_id === user.id)
      };
      
      const tDetails = (teacherDetailsData || []).filter(t => t.user_id === user.id);
      if (u.type === 'teacher' && tDetails.length > 0) {
        u.doj = tDetails[0].doj;
        u.father_spouse_name = tDetails[0].father_spouse_name;
      }
      
      return u;
    });

    const mappedParents = (parentsData || []).map(p => {
      let connections = [];
      let pClasses = new Set();
      if (studentParentsData) {
        connections = studentParentsData.filter(c => c.parent_id === p.id).map(c => c.student_id);
        connections.forEach(studentId => {
          const sClasses = (classStudentsData || []).filter(c => c.student_id === studentId).map(c => c.class_id);
          sClasses.forEach(c => pClasses.add(c));
        });
      }
      return {
        id: p.id,
        name: (p.father_name && p.mother_name) ? `${p.father_name} & ${p.mother_name}` : (p.father_name || p.mother_name || 'Parent'),
        type: 'parent',
        email: '',
        phone: p.phone || p.alternate_number || '',
        created_at: p.created_at,
        status: 'active',
        father_name: p.father_name,
        mother_name: p.mother_name,
        alternate_number: p.alternate_number,
        connections,
        classes: Array.from(pClasses),
        grade: [],
        fees: [],
        notification: [],
        activity: []
      };
    });

    return [...mappedUsers, ...mappedParents];
  }

  static async getUserById(id) {
    const { data: user, error } = await supabase
      .from("user")
      .select("*")
      .eq("id", id);

    if (error) throw error;
    if (!user || user.length === 0) {
      throw new Error("User not found");
    }
    
    const u = user[0];

    // Fetch related data in parallel
    const [
      { data: gradesData },
      { data: feesData },
      { data: notificationsData },
      { data: activitiesData },
      { data: connectionsData }
    ] = await Promise.all([
      supabase.from("grades").select("*").eq("student_id", u.id),
      supabase.from("student_fees").select("*, fee(*)").eq("student_id", u.id),
      supabase.from("notifications").select("*").eq("user_id", u.id),
      supabase.from("activities").select("*").eq("user_id", u.id),
      supabase.from("user_connections").select("*").or(`student_id.eq.${u.id},parent_id.eq.${u.id}`)
    ]);
      
    let connections = [];
    if (connectionsData) {
      if (u.type === 'student') {
        connections = connectionsData.filter(c => c.student_id === u.id).map(c => c.parent_id);
      } else if (u.type === 'parent') {
        connections = connectionsData.filter(c => c.parent_id === u.id).map(c => c.student_id);
      }
    }
    
    return {
      ...u,
      connections,
      grade: gradesData || [],
      fees: feesData || [],
      notification: notificationsData || [],
      activity: activitiesData || []
    };
  }

  static async deleteUser(id) {
    // With ON DELETE CASCADE defined in the database schema, 
    // simply deleting the user will automatically remove:
    // - attendance, grades, student_fees, notifications, activities
    // - user_connections, class_students, class_teachers, timeTable entries
    
    // Also delete from auth.users if we have admin client
    if (supabaseAdmin) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      if (authError) throw new Error("Auth user deletion failed: " + authError.message);
    } else {
      // Fallback: just delete from public.user (cascade handles the rest)
      const { error } = await supabase.from("user").delete().eq("id", id);
      if (error) throw new Error("User deletion failed: " + error.message);
    }
    
    return true;
  }

  static async forgetPassword(email, phone, password) {
    const { data: user, error } = await supabase
      .from("user")
      .select("*")
      .match({ email, phone });

    if (error || !user || user.length === 0) {
      throw new Error("Could not find user");
    }

    if (!supabaseAdmin) throw new Error("Supabase Admin client missing for password updates.");
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user[0].id, {
      password
    });
    if (authError) throw authError;

    return true;
  }

  static async uploadBulkUser(data) {
    const createdUsers = [];
    if (!supabaseAdmin) throw new Error("Supabase Admin client missing for bulk uploads.");

    // Fetch all existing classes
    const { data: existingClasses } = await supabase.from("class").select("id, name, section");
    let currentClasses = existingClasses || [];

    for (let user of data) {
      if (!user.email || !user.password || !user.name || !user.type) {
        throw new Error(`Missing required fields for user: ${JSON.stringify(user)}. Name: ${user.name}, Email: ${user.email}, Password: ${user.password}, Type: ${user.type}`);
      }
      
      const metadata = {
        name: user.name,
        type: user.type,
        phone: user.phone,
        gender: user.gender,
        dob: user.dob,
        status: user.status || 'active'
      };
      
      // Strip out empty string values to prevent Supabase 500 internal triggers from crashing on Date typecasts
      Object.keys(metadata).forEach(key => {
        if (metadata[key] == null || String(metadata[key]).trim() === '' || String(metadata[key]).trim() === 'undefined') {
          delete metadata[key];
        } else if (key === 'dob') {
          const validDate = UserService.parseSafeDate(metadata[key]);
          if (!validDate) {
            console.warn(`Invalid DOB format ignored: ${metadata[key]}`);
            delete metadata[key];
          } else {
            metadata[key] = validDate; // Standardize to YYYY-MM-DD
          }
        }
      });

      console.log(`Creating user with metadata:`, metadata);

      // Retry logic for Supabase Auth rate-limiting
      let authData = null;
      let lastAuthError = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const { data: ad, error: ae } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: metadata
        });
        if (!ae) {
          authData = ad;
          lastAuthError = null;
          break;
        }
        if (ae.message && ae.message.toLowerCase().includes("already registered")) {
          const { data: existing } = await supabase.from("user").select("id").eq("email", user.email).single();
          if (existing) {
            authData = { user: { id: existing.id } };
            lastAuthError = null;
            break;
          }
        }
        lastAuthError = ae;
        console.warn(`Auth attempt ${attempt}/3 failed for ${user.email}: ${ae.message || 'AuthRetryableFetchError'}. Retrying in ${attempt * 1000}ms...`);
        await new Promise(r => setTimeout(r, attempt * 1000)); // 1s, 2s, 3s backoff
      }
      
      if (lastAuthError) {
        console.error("Auth creation failed permanently for user:", user.email, lastAuthError);
        throw new Error(`Failed to create Auth user for ${user.email}: ${lastAuthError.message || JSON.stringify(lastAuthError)}`);
      }

      if (authData?.user) {
        if (user.type === 'student') {
          const studentFields = {
            admission_number: user.admission_number,
            house: user.house,
            father_name: user.father_name,
            mother_name: user.mother_name,
            monthly_fee: user.monthly_fee || 0,
            bus_fee: user.bus_fee || 0,
            fee_exempted: user.fee_exempted === 'true' || user.fee_exempted === true,
            admission_date: UserService.parseSafeDate(user.admission_date),
            alternate_number: user.alternate_number,
            form_submitted: user.form_submitted === 'true' || user.form_submitted === true,
            address: user.address,
            leave_school: user.leave_school === 'true' || user.leave_school === true,
            tc_received: user.tc_received === 'true' || user.tc_received === true,
            tc_date: UserService.parseSafeDate(user.tc_date),
            slc_received: user.slc_received === 'true' || user.slc_received === true,
            slc_date: UserService.parseSafeDate(user.slc_date),
            character_certificate_received: user.character_certificate_received === 'true' || user.character_certificate_received === true,
            character_certificate_date: UserService.parseSafeDate(user.character_certificate_date),
            tc_document_url: user.tc_document_url,
            slc_document_url: user.slc_document_url,
            character_certificate_document_url: user.character_certificate_document_url
          };
          Object.keys(studentFields).forEach(key => (studentFields[key] === undefined || studentFields[key] === '') && delete studentFields[key]);
          
          if (Object.keys(studentFields).length > 0) {
            const { error: updateError } = await supabaseAdmin.from("user").update(studentFields).eq("id", authData.user.id);
            if (updateError) {
              await supabaseAdmin.auth.admin.deleteUser(authData.user.id); // Rollback auth creation
              throw new Error(`Failed to save student profile for ${user.email}: ${updateError.message}`);
            }
          }

          // Handle Class Mapping
          let targetClassName = user.className || user.class;
          let targetSection = user.section || user.sec;
          
          if (targetClassName) {
            targetClassName = String(targetClassName).trim().toUpperCase();
            targetSection = targetSection ? String(targetSection).trim().toUpperCase() : "A";

            let matchedClass = currentClasses.find(c => String(c.name).toUpperCase() === targetClassName && String(c.section).toUpperCase() === targetSection);
            
            if (!matchedClass) {
              const { data: newClassData } = await supabaseAdmin.from("class").insert([{ name: targetClassName, section: targetSection }]).select("id, name, section");
              if (newClassData && newClassData.length > 0) {
                matchedClass = newClassData[0];
                currentClasses.push(matchedClass);
              }
            }
            
            if (matchedClass) {
              await supabaseAdmin.from("class_students").insert([{ class_id: matchedClass.id, student_id: authData.user.id }]);
            }
          }

        } else if (user.type === 'teacher') {
          const teacherDetails = {
            user_id: authData.user.id,
            doj: UserService.parseSafeDate(user.doj) || user.doj,
            father_spouse_name: user.father_spouse_name
          };
          Object.keys(teacherDetails).forEach(key => (teacherDetails[key] === undefined || teacherDetails[key] === '') && delete teacherDetails[key]);
          
          if (Object.keys(teacherDetails).length > 1) {
            await supabaseAdmin.from("teacher_details").insert([teacherDetails]);
          }
          
          const commonFields = { address: user.address, dob: user.dob, phone: user.phone };
          Object.keys(commonFields).forEach(key => (commonFields[key] === undefined || commonFields[key] === '') && delete commonFields[key]);
          if (Object.keys(commonFields).length > 0) {
            const { error: updateError } = await supabaseAdmin.from("user").update(commonFields).eq("id", authData.user.id);
            if (updateError) {
              await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
              throw new Error(`Failed to save teacher profile for ${user.email}: ${updateError.message}`);
            }
          }
        }
        createdUsers.push(authData.user);
      }

      // Small delay between users to avoid Auth API rate limits
      await new Promise(r => setTimeout(r, 500));
    }
    return createdUsers;
  }

  
  
  static async updateNotification(id) {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", id);
    if (error) throw new Error("Could not update notifications: " + error.message);
    return true;
  }

  static async getTeacherWeek() {
    const { data: teachers, error: teachersError } = await supabase.from("user").select("*").eq("type", "teacher");
    if (teachersError) throw teachersError;

    // Return the first teacher for now
    return teachers?.[0]?.id || null;
  }
}
