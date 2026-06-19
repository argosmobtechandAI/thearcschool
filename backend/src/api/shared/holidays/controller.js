import { supabase } from "../../../config/supabaseClient.js";

// GET all public holidays
export const getHolidays = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("public_holidays")
      .select("*")
      .order("date", { ascending: true });

    if (error) {
      if (error.code === '42P01') {
         // table doesn't exist yet, return empty
         return res.status(200).json({ data: [] });
      }
      throw error;
    }

    res.status(200).json({ data });
  } catch (error) {
    console.error("Error fetching holidays:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST a new public holiday
export const createHoliday = async (req, res) => {
  try {
    const { date, name, type } = req.body;
    if (!date || !name) {
      return res.status(400).json({ message: "Date and name are required." });
    }

    const { data, error } = await supabase
      .from("public_holidays")
      .insert([{ date, name, type: type || 'Public Holiday' }])
      .select();

    if (error) throw error;

    res.status(201).json({ message: "Holiday created successfully", data });
  } catch (error) {
    console.error("Error creating holiday:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// DELETE a public holiday
export const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("public_holidays")
      .delete()
      .eq("id", id);

    if (error) throw error;

    res.status(200).json({ message: "Holiday deleted successfully" });
  } catch (error) {
    console.error("Error deleting holiday:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
