import { supabase } from "../../../config/supabaseClient.js";

export const createEvent = async (req, res) => {
  try {
    const { data } = req.body;

    if (!data?.date || (!data?.title && !data?.topic)) {
      return res.status(400).json({
        success: false,
        message: "Date and topic are required",
      });
    }

    // 1️⃣ Create Event
    const { data: newEvent, error: insertError } = await supabase
      .from("events")
      .insert([
        {
          date: data.date,
          title: data.topic || data.title,
          description: data.description || null,
          location: data.location || null,
          target_audience: data.target_audience || null,
        },
      ])
      .select();

    if (insertError || !newEvent || !newEvent.length) {
      return res.status(400).json({
        success: false,
        message: insertError ? insertError.message : "Event could not be created",
      });
    }

    // 2️⃣ Notify All Users
    const { data: users, error: usersError } = await supabase.from("user").select("id");

    if (!usersError && users && users.length > 0) {
      const notificationInserts = users.map(user => ({
        user_id: user.id,
        title: data.topic || data.title,
        message: `You have new Event "${data.topic || data.title}"`,
        type: "event",
        is_read: false
      }));

      await supabase.from("notifications").insert(notificationInserts);
    }

    // 3️⃣ Add Activity for Principals
    const { data: principals } = await supabase
      .from("user")
      .select("id")
      .eq("type", "principal");

    if (principals && principals.length > 0) {
      const activityInserts = principals.map(prince => ({
        user_id: prince.id,
        title: "Event Created",
        message: `New Event "${data.topic || data.title}" scheduled on ${data.date}`,
        type: "event",
        is_read: false
      }));

      await supabase.from("activities").insert(activityInserts);
    }

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: newEvent[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error creating event: ${error.message}`,
    });
  }
};

export const getAllEvents = async (req, res) => {
  try {
    const { data: events, error } = await supabase.from("events").select("*");

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error fetching events: ${error.message}`,
    });
  }
};

export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: event, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id);

    if (error) throw error;

    if (!event || !event.length) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: event[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error fetching event: ${error.message}`,
    });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = req.body;

    const updateObj = {
      ...(data.date && { date: data.date }),
      ...((data.topic || data.title) && { title: data.topic || data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.target_audience !== undefined && { target_audience: data.target_audience }),
    };

    const { data: updated, error } = await supabase
      .from("events")
      .update(updateObj)
      .eq("id", id)
      .select();

    if (error || !updated || !updated.length) {
      return res.status(404).json({
        success: false,
        message: error ? error.message : "Event not found or not updated",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: updated[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error updating event: ${error.message}`,
    });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: deleted, error } = await supabase
      .from("events")
      .delete()
      .eq("id", id)
      .select();

    if (error || !deleted || !deleted.length) {
      return res.status(404).json({
        success: false,
        message: error ? error.message : "Event not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Error deleting event: ${error.message}`,
    });
  }
};
