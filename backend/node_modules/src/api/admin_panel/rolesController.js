import { supabase } from "../../config/supabaseClient.js";

// Create a new staff responsibility role
export const createRole = async (req, res) => {
  try {
    const { user_id, role_title, duties } = req.body;
    
    if (!user_id || !role_title) {
      return res.status(400).json({ error: "User ID and Role Title are required" });
    }

    const { data, error } = await supabase
      .from("staff_responsibilities")
      .insert([{ user_id, role_title, duties }])
      .select(`
        *,
        user (
          name,
          email,
          type
        )
      `)
      .single();

    if (error) throw error;
    res.status(201).json({ data, message: "Role created successfully" });
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all staff responsibilities
export const getRoles = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("staff_responsibilities")
      .select(`
        *,
        user (
          name,
          email,
          type
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json({ data });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update a staff responsibility
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, role_title, duties } = req.body;

    const { data, error } = await supabase
      .from("staff_responsibilities")
      .update({ user_id, role_title, duties, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(`
        *,
        user (
          name,
          email,
          type
        )
      `)
      .single();

    if (error) throw error;
    res.status(200).json({ data, message: "Role updated successfully" });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a staff responsibility
export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("staff_responsibilities")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.status(200).json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({ error: error.message });
  }
};
