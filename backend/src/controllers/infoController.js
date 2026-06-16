import { supabase } from "../config/supabaseClient.js";

// ---------------- GET INFO ----------------
export const getInfo = async (req, res) => {
  try {
    const { data: information, error } = await supabase
      .from("schoolInfo")
      .select("*");

    if (error) throw error;

    // Map V2 columns (key/value) back to frontend names (title/content)
    const mapped = (information || []).map(i => ({ ...i, title: i.key, content: i.value }));

    return res.status(200).json({
      success: true,
      info: mapped,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${e.message}`,
    });
  }
};

// ---------------- CREATE INFO ----------------
export const createInfo = async (req, res) => {
  const { data } = req.body;

  try {
    if (!data) {
      return res.status(400).json({
        success: false,
        message: "Data is required",
      });
    }

    // Map frontend field names to V2 DB column names
    const insertData = {
      key: data.title || data.key,
      value: data.content || data.value,
    };

    const { data: information, error } = await supabase
      .from("schoolInfo")
      .insert([insertData])
      .select();

    if (error) throw error;

    // Map back to frontend field names
    const mapped = information.map(i => ({ ...i, title: i.key, content: i.value }));

    return res.status(201).json({
      success: true,
      info: mapped,
      message: "Successfully created",
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${e.message}`,
    });
  }
};

// ---------------- UPDATE INFO ----------------
export const updateInfo = async (req, res) => {
  const { data } = req.body;

  if (!data || !data.id) {
    return res.status(400).json({
      success: false,
      message: "ID and data are required",
    });
  }

  const { id, createdAt, created_at, ...rawData } = data;

  // Map frontend names to V2 DB column names
  const updateData = {};
  if (rawData.title || rawData.key) updateData.key = rawData.title || rawData.key;
  if (rawData.content || rawData.value) updateData.value = rawData.content || rawData.value;

  try {
    const { data: information, error: existingError } = await supabase
      .from("schoolInfo")
      .select("*")
      .eq("id", id);

    if (existingError || !information || information.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Info not found",
      });
    }

    const { data: updatedInfo, error: updateError } = await supabase
      .from("schoolInfo")
      .update(updateData)
      .eq("id", id)
      .select();

    if (updateError) throw updateError;

    const mapped = updatedInfo.map(i => ({ ...i, title: i.key, content: i.value }));

    return res.status(200).json({
      success: true,
      message: "Info updated successfully",
      data: mapped,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${e.message}`,
    });
  }
};

// ---------------- DELETE INFO ----------------
export const deleteInfo = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "ID is required",
    });
  }

  try {
    const { data: deletedInfo, error } = await supabase
      .from("schoolInfo")
      .delete()
      .eq("id", id)
      .select();

    if (error || !deletedInfo || deletedInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Info not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Info deleted successfully",
      data: deletedInfo,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${e.message}`,
    });
  }
};