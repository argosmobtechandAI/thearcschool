import { supabase } from "../config/supabaseClient.js";

export const createRoom = async (req, res) => {
  const { data } = req.body;

  if (!data?.name) {
    return res.status(400).json({
      success: false,
      message: "Room name is required",
    });
  }

  try {
    const { data: room, error } = await supabase
      .from("rooms")
      .insert([{ name: data.name, capacity: data.capacity || null }])
      .select();

    if (error) {
      if (error.code === '23505') { // unique violation
        return res.status(400).json({
          success: false,
          message: "Room already exists",
        });
      }
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: "Room created successfully",
      room: room[0],
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${e.message}`,
    });
  }
};

export const getRooms = async (req, res) => {
  try {
    const { data: rooms, error } = await supabase
      .from("rooms")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      count: rooms.length,
      rooms: rooms || [],
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${e.message}`,
    });
  }
};

export const updateRoom = async (req, res) => {
  const { id } = req.params;
  const { data } = req.body;

  if (!data?.name) {
    return res.status(400).json({
      success: false,
      message: "Room name is required",
    });
  }

  try {
    const { data: updatedRoom, error } = await supabase
      .from("rooms")
      .update({ name: data.name, capacity: data.capacity || null })
      .eq("id", id)
      .select();

    if (error || !updatedRoom || updatedRoom.length === 0) {
      return res.status(404).json({
        success: false,
        message: error ? error.message : "Room not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Room updated successfully",
      room: updatedRoom[0],
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${e.message}`,
    });
  }
};

export const deleteRoom = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from("rooms")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${e.message}`,
    });
  }
};
