import { supabase, supabaseAdmin } from "../../../config/supabaseClient.js";

// Note: bcrypt import is no longer needed since Supabase Auth handles hashing

export const createNewUser = async (req, res) => {
  const { data } = req.body;

  try {
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
          assigned_to: data.assigned_to || null,
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
  const id = Number(req.params.id);

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
  const id = Number(req.params.id);
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
  const id = Number(req.params.id);

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
        .eq("id", Number(id));

      if (userError) throw userError;

      if (!userReq || !userReq.length) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const initialPassword = userReq[0].name.toLowerCase();

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
          status: payload.status || 'active'
        }
      });

      if (authError) throw authError;

      // The PostgreSQL trigger handles creating the public.user row.

      const { data: updatedUser, error: updateError } = await supabase
        .from("newUsers")
        .update({ status: "approved" })
        .eq("id", Number(id))
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
        .eq("id", Number(id))
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