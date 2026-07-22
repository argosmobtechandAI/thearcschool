import { supabase, supabaseAdmin } from "../../../config/supabaseClient.js";
import fs from "fs";
import { resolveLocalPath } from "../upload/deleteController.js";

// Note: bcrypt import is no longer needed since Supabase Auth handles hashing

export const createNewUser = async (req, res) => {
  const { data } = req.body;

  try {
    let assignedTo = data.assigned_to || null;
    if (assignedTo) {
      // Ensure the assigned_to user actually exists in the DB
      const { data: userCheck } = await supabase.from('user').select('id').eq('id', assignedTo).single();
      if (!userCheck) {
        assignedTo = null; // User doesn't exist, fallback to null
      }
    }

    const { data: insertedUser, error } = await supabase
      .from("newUsers")
      .insert([
        {
          name: data.name,
          email: data.email,
          parent: data.parent,
          parentEmail: data.parentEmail,
          phone: data.phone,
          status: data.status,
          dob: data.dob,
          gender: data.gender,
          documents: data.documents || [],
          assigned_to: assignedTo,
          class_id: data.class_id || null,
          house: data.house || null,
          bus_fee: data.bus_fee || 0,
          monthly_fee: data.monthly_fee || 0,
          fee_exempted: data.fee_exempted || false,
          admission_date: data.admission_date || null,
          address: data.address || null,
        },
      ])
      .select();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data: insertedUser[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllNewUsers = async (req, res) => {
  try {
    const { data: users, error } = await supabase.from("newUsers").select("*");

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSingleNewUser = async (req, res) => {
  const id = req.params.id;

  try {
    const { data: user, error } = await supabase
      .from("newUsers")
      .select("*")
      .eq("id", id);

    if (error) throw error;

    if (!user || !user.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateNewUser = async (req, res) => {
  const id = req.params.id;
  const { data } = req.body;

  try {
    const { data: updatedUser, error } = await supabase
      .from("newUsers")
      .update({
        name: data.name,
        email: data.email,
        parent: data.parent,
        parentEmail: data.parentEmail,
        phone: data.phone,
        status: data.status,
        dob: data.dob,
        gender: data.gender,
        documents: data.documents,
        assigned_to: data.assigned_to || null,
        class_id: data.class_id || null,
        house: data.house || null,
        bus_fee: data.bus_fee || 0,
        monthly_fee: data.monthly_fee || 0,
        fee_exempted: data.fee_exempted || false,
        admission_date: data.admission_date || null,
        address: data.address || null,
      })
      .eq("id", id)
      .select();

    if (error) throw error;

    if (!updatedUser || !updatedUser.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedUser[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteNewUser = async (req, res) => {
  const id = req.params.id;

  try {
    // 1. Fetch the user first to get their documents array for cleanup
    const { data: userToDel, error: fetchError } = await supabase
      .from("newUsers")
      .select("documents")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // 2. Delete from DB
    const { data: deletedUser, error } = await supabase
      .from("newUsers")
      .delete()
      .eq("id", id)
      .select();

    if (error) throw error;

    if (!deletedUser || !deletedUser.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 3. Delete physical files from disk (best-effort)
    if (userToDel?.documents && Array.isArray(userToDel.documents)) {
      userToDel.documents.forEach((doc) => {
        if (doc.url) {
          try {
            const localPath = resolveLocalPath(doc.url);
            if (localPath && fs.existsSync(localPath)) {
              fs.unlinkSync(localPath);
            }
          } catch (fileErr) {
            console.error(`Failed to delete orphaned file ${doc.url}:`, fileErr);
          }
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const approveNewUser = async (req, res) => {
  const { data } = req.body;
  const { payload, id, status } = data;

  if (status.toLowerCase() === "approved") {
    try {
      if (!supabaseAdmin) {
        throw new Error("Supabase Admin client not initialized. Ensure SERVICE_ROLE_KEY is set in .env");
      }

      const { data: userReq, error: userError } = await supabase
        .from("newUsers")
        .select("*")
        .eq("id", id);

      if (userError) throw userError;

      if (!userReq || !userReq.length) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const candidate = userReq[0];
      const avatarUrl = payload.avatar_url || candidate.avatar_url || (Array.isArray(candidate.documents) ? candidate.documents.find(d => d.type === "avatar")?.url : "");

      const initialPassword = "Password@123";

      // Create user using Supabase Auth Admin API. 
      // We rely heavily on 'candidate' (which is the actual DB application record) 
      // rather than 'payload' which might be malformed from the frontend.
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email || candidate.email,
        password: initialPassword,
        email_confirm: true,
        user_metadata: {
          name: payload.name || candidate.name,
          type: payload.type || 'student',
          phone: payload.phone || candidate.phone,
          gender: candidate.gender || null,
          dob: candidate.dob || null,
          status: payload.status || 'active',
          avatar_url: avatarUrl,
          address: candidate.address || null,
          house: candidate.house || null,
          bus_fee: candidate.bus_fee || 0,
          monthly_fee: candidate.monthly_fee || 0,
          fee_exempted: candidate.fee_exempted || false,
          admission_date: candidate.admission_date || null
        }
      });

      if (authError) throw authError;

      // Update avatar_url directly in public.user to guarantee it is saved!
      const userUpdateFields = {};
      if (avatarUrl) userUpdateFields.avatar_url = avatarUrl;
      if (Array.isArray(candidate.documents)) {
        candidate.documents.forEach(doc => {
          if (doc.type === 'tc') userUpdateFields.tc_document_url = doc.url;
          else if (doc.type === 'slc') userUpdateFields.slc_document_url = doc.url;
          else if (doc.type === 'characterCertificate') userUpdateFields.character_certificate_document_url = doc.url;
        });
      }
      
      if (Object.keys(userUpdateFields).length > 0) {
        const { error: profilePicError } = await supabase
          .from("user")
          .update(userUpdateFields)
          .eq("id", authData.user.id);
        if (profilePicError) {
          console.error("Failed to update extra fields in public.user:", profilePicError);
        }
      }

      // The PostgreSQL trigger handles creating the public.user row.
      
      // Assign the student to the selected class
      if (userReq[0].class_id) {
        const { error: classAssignError } = await supabase
          .from("class_students")
          .insert([{ student_id: authData.user.id, class_id: userReq[0].class_id }]);
        
        if (classAssignError) {
          console.error("Failed to assign class to new student:", classAssignError);
        }
      }

      // Automatically generate a one-time Admission Fee (5000) for the new student
      if (payload.type === 'student' || candidate.type === 'student') {
        try {
          // 1. Get or create the 'Admission Fee' template
          const { data: existingFees } = await supabase
            .from("fee")
            .select("id")
            .eq("title", "New Admission Fee (Form + Admsn)")
            .limit(1);

          let feeId;
          if (existingFees && existingFees.length > 0) {
            feeId = existingFees[0].id;
          } else {
            const { data: newFee, error: newFeeErr } = await supabase
              .from("fee")
              .insert([{ title: "New Admission Fee (Form + Admsn)", amount: 5000, fee_type: "One-time" }])
              .select("id")
              .single();
            if (newFeeErr) throw newFeeErr;
            feeId = newFee.id;
          }

          // 2. Assign to student
          const { error: assignErr } = await supabase
            .from("student_fees")
            .insert([{ student_id: authData.user.id, fee_id: feeId, payment_status: 'pending', total_paid_amount: 0 }]);
          
          if (assignErr) throw assignErr;
          console.log("Successfully assigned Admission Fee to", authData.user.id);
        } catch (err) {
          console.error("Failed to generate admission fee:", err.message);
        }
      }

      const { data: updatedUser, error: updateError } = await supabase
        .from("newUsers")
        .update({ status: "approved" })
        .eq("id", id)
        .select();

      if (updateError) throw updateError;

      return res.status(200).json({
        success: true,
        data: updatedUser[0],
        message: "User approved successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  } else {
    try {
      const { data: updatedUser, error } = await supabase
        .from("newUsers")
        .update({ status: "rejected" })
        .eq("id", id)
        .select();

      if (error) throw error;

      if (!updatedUser || !updatedUser.length) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      } else {
        return res.status(200).json({
          success: true,
          data: updatedUser[0],
          message: "User rejected successfully",
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
};