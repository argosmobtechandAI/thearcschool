import { supabase, supabaseAdmin } from "../config/supabaseClient.js";
import { calculateStudentScore } from "../utils/helpers.js";

export class UserService {
  static parseSafeDate(dateString) {
    if (!dateString) return null;
    let d = new Date(dateString);
    if (isNaN(d.getTime()) && dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        // DD/MM/YYYY
        d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
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
        phone: userData.phone,
        gender: userData.gender,
        dob: userData.dob,
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

    return true;
  }

  static async getUsers() {
    // Fetch users with all their related normalized data to match frontend expectations
    const { data: users, error } = await supabase.from("user").select(`
      *,
      grade:grades!student_id(*),
      fees:student_fees!student_id(*),
      notification:notifications(*),
      activity:activities(*),
      class_students(class_id),
      class_teachers(class_id)
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
        fees:student_fees!student_id(*),
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
        }
        createdUsers.push(authData.user);
      }
    }
    return createdUsers;
  }

  static async updateMarks(data) {
    // Upsert the grade for student + exam
    const upsertData = {
      student_id: data.id,
      exam_id: data.typeId,
      marks: data.marks
    };
    if (data.courseId) upsertData.course_id = data.courseId;
    
    const { error } = await supabase.from("grades").upsert(
      upsertData,
      { onConflict: 'student_id,exam_id,course_id' }
    );
    if (error) throw new Error("Could not update marks: " + error.message);
    return true;
  }

  static async updateAttendance(id, data) {
    if (!data.status || data.status === "delete" || data.status === "unmarked") {
      const { error } = await supabase.from("attendance").delete().match({ student_id: id, date: data.date });
      if (error) throw new Error("Could not delete attendance: " + error.message);
      return true;
    }

    const { error } = await supabase.from("attendance").upsert(
      {
        student_id: id,
        date: data.date,
        status: data.status,
        remarks: data.remarks || null
      },
      { onConflict: 'student_id,date' }
    );
    if (error) throw new Error("Could not update attendance: " + error.message);
    return true;
  }

  static async bulkUpdateAttendance(records) {
    // records: [{ student_id: uuid, date: string, status: string }]
    const { error } = await supabase.from("attendance").upsert(
      records,
      { onConflict: 'student_id,date' }
    );
    if (error) throw new Error("Could not bulk update attendance: " + error.message);
    return true;
  }

  static async getAttendance(startDate, endDate, classId) {
    let query = supabase.from("attendance").select("*");
    
    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }
    
    const { data, error } = await query;
    if (error) throw new Error("Could not fetch attendance: " + error.message);
    
    return data;
  }

  static async addFee(data) {
    const { studentId, ...rawFeeData } = data;
    // Map frontend field names to V2 DB column names
    const feeData = {
      title: rawFeeData.title,
      amount: rawFeeData.totalAmount || rawFeeData.amount,
      dueDate: rawFeeData.lastDate || rawFeeData.dueDate,
      type: rawFeeData.type || null
    };
    const { data: newFeeArr, error: insertError } = await supabase.from("fee").insert([feeData]).select();
    if (insertError || !newFeeArr || !newFeeArr.length) throw new Error("Fee creation failed: " + (insertError?.message || ''));
    const newFee = newFeeArr[0];

    if (studentId && studentId.length > 0) {
      const studentFeeInserts = studentId.map(id => ({
        student_id: id,
        fee_id: newFee.id,
        status: 'pending'
      }));
      await supabase.from("student_fees").insert(studentFeeInserts);
      
      const notificationInserts = studentId.map(id => ({
        user_id: id,
        title: "Fee Pending",
        message: `Your fee "${newFee.title}" of ₹${newFee.amount} is pending.`,
        type: "fee",
        is_read: false
      }));
      await supabase.from("notifications").insert(notificationInserts);
    }

    const { data: principals } = await supabase.from("user").select("*").eq("type", "principal");
    if (principals && principals.length > 0) {
      const activityInserts = principals.map(prince => ({
        user_id: prince.id,
        title: "Fee Created",
        message: `New Fee "${newFee.title}" of ₹${newFee.amount} is created.`,
        type: "fee",
        is_read: false
      }));
      await supabase.from("activities").insert(activityInserts);
    }
    return true;
  }

  static async submitFees(studentId, feeId, data) {
      const d = new Date();
      const localDateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
      
      const { data: updatedFee, error } = await supabase
      .from("student_fees")
      .update({ status: data.status, amount_paid: data.paidAmount || data.amount_paid, payment_date: localDateStr })
      .match({ student_id: studentId, fee_id: feeId });
    if (error) throw new Error("Could not submit fee: " + error.message);
    return true;
  }

  static async getTopper() {
    const { data: students, error } = await supabase.from("user").select("*, grades:grades!student_id(*)").eq("type", "student");
    if (error) throw error;
    if (!students || !students.length) return { topper: null, score: 0 };

    let bestStudent = null;
    let highestScore = -Infinity;
    for (let student of students) {
      let totalMarks = 0;
      let totalExams = 0;
      if (student.grades && student.grades.length > 0) {
        student.grades.forEach(g => {
          if (g.marks != null) {
            totalMarks += Number(g.marks);
            totalExams++;
          }
        });
      }
      const score = totalExams > 0 ? totalMarks / totalExams : 0;
      
      if (score > highestScore) {
        highestScore = score;
        bestStudent = student;
      }
    }
    return { topper: bestStudent, score: highestScore };
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
