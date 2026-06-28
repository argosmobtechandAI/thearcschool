import { supabase, supabaseAdmin } from "../../../config/supabaseClient.js";

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

      // Create user using Supabase Auth Admin API
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: initialPassword,
        email_confirm: true,
        user_metadata: {
          name: payload.name,
          type: payload.type || 'student',
          phone: payload.phone,
          gender: payload.gender,
          dob: payload.dob,
          status: payload.status || 'active',
          avatar_url: avatarUrl
        }
      });

      if (authError) throw authError;

      // Update avatar_url directly in public.user to guarantee it is saved!
      if (avatarUrl) {
        const { error: profilePicError } = await supabase
          .from("user")
          .update({ avatar_url: avatarUrl })
          .eq("id", authData.user.id);
        if (profilePicError) {
          console.error("Failed to update avatar_url in public.user:", profilePicError);
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