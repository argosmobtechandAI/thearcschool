import { supabase, supabaseAdmin } from "../../../config/supabaseClient.js";
import { calculateStudentScore } from "../../../utils/helpers.js";
import { FeeGenerator } from "../../finance_panel/feeGenerator.js";

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

    // Auto-assign admission fees
    if (userData.type === 'student') {
      try {
        await FeeGenerator.assignAdmissionFees(newUserId);
      } catch (err) {
        console.error("Failed to assign admission fees:", err);
      }
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
    // Fetch users with all their related normalized data to match frontend expectations
    const { data: users, error } = await supabase.from("user").select(`
      *,
      grade:grades!student_id(*),
      fees:student_fees!student_id(*, fee(*)),
      notification:notifications(*),
      activity:activities(*),
      class_students(class_id),
      class_teachers(class_id),
      teacher_details(*)
    `);
    if (error) throw error;
    
    // For connections, we need to fetch user_connections and map them
    const { data: connectionsData } = await supabase.from("user_connections").select("*");
    
    const mappedUsers = users.map(user => {
      let connections = [];
      if (connectionsData) {
        if (user.type === 'student') {
          connections = connectionsData.filter(c => c.student_id === user.id).map(c => c.parent_id);
        } else if (user.type === 'parent') {
          connections = connectionsData.filter(c => c.parent_id === user.id).map(c => c.student_id);
        }
      }
      let classes = [];
      if (user.type === 'student') {
        classes = user.class_students?.map(c => c.class_id) || [];
      } else if (user.type === 'teacher') {
        classes = user.class_teachers?.map(c => c.class_id) || [];
      }

      const u = { ...user, connections, classes };
      
      if (u.type === 'teacher' && u.teacher_details && u.teacher_details.length > 0) {
        u.doj = u.teacher_details[0].doj;
        u.father_spouse_name = u.teacher_details[0].father_spouse_name;
      }
      
      delete u.teacher_details;
      delete u.staff_details;
      
      delete u.class_students;
      delete u.class_teachers;
      return u;
    });

    return mappedUsers;
  }

  static async getUserById(id) {
    const { data: user, error } = await supabase
      .from("user")
      .select(`
        *,
        grade:grades!student_id(*),
        fees:student_fees!student_id(*, fee(*)),
        notification:notifications(*),
        activity:activities(*)
      `)
      .eq("id", id);

    if (error) throw error;
    if (!user || user.length === 0) {
      throw new Error("User not found");
    }
    
    const u = user[0];
    const { data: connectionsData } = await supabase.from("user_connections")
      .select("*")
      .or(`student_id.eq.${u.id},parent_id.eq.${u.id}`);
      
    let connections = [];
    if (connectionsData) {
      if (u.type === 'student') {
        connections = connectionsData.filter(c => c.student_id === u.id).map(c => c.parent_id);
      } else if (u.type === 'parent') {
        connections = connectionsData.filter(c => c.parent_id === u.id).map(c => c.student_id);
      }
    }
    
    return { ...u, connections };
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

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: metadata
      });
      
      if (authError) {
        console.error("Auth creation failed for user:", user.email, authError);
        throw new Error(`Failed to create Auth user for ${user.email}: ${authError.message || JSON.stringify(authError)}`);
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
            const { error: updateError } = await supabase.from("user").update(studentFields).eq("id", authData.user.id);
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
              const { data: newClassData } = await supabase.from("class").insert([{ name: targetClassName, section: targetSection }]).select("id, name, section");
              if (newClassData && newClassData.length > 0) {
                matchedClass = newClassData[0];
                currentClasses.push(matchedClass);
              }
            }
            
            if (matchedClass) {
              await supabase.from("class_students").insert([{ class_id: matchedClass.id, student_id: authData.user.id }]);
            }
          }

          try {
            await FeeGenerator.assignAdmissionFees(authData.user.id);
          } catch (err) {
            console.error("Failed to assign admission fees during bulk upload:", err);
          }
        } else if (user.type === 'teacher') {
          const teacherDetails = {
            user_id: authData.user.id,
            doj: UserService.parseSafeDate(user.doj) || user.doj,
            father_spouse_name: user.father_spouse_name
          };
          Object.keys(teacherDetails).forEach(key => (teacherDetails[key] === undefined || teacherDetails[key] === '') && delete teacherDetails[key]);
          
          if (Object.keys(teacherDetails).length > 1) {
            await supabase.from("teacher_details").insert([teacherDetails]);
          }
          
          const commonFields = { address: user.address, dob: user.dob };
          Object.keys(commonFields).forEach(key => (commonFields[key] === undefined || commonFields[key] === '') && delete commonFields[key]);
          if (Object.keys(commonFields).length > 0) {
            const { error: updateError } = await supabase.from("user").update(commonFields).eq("id", authData.user.id);
            if (updateError) {
              console.error("Failed to update teacher common fields", updateError);
            }
          }
        }
        createdUsers.push(authData.user);
      }
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
