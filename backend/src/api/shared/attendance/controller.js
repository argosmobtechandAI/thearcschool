import { supabase } from "../../../config/supabaseClient.js";
import { AttendanceService } from "./service.js";

export const getStudentAttendance = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: records, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      records: records ? records.map(r => ({ ...r, student_id: r.user_id, status: r.status?.toLowerCase() })) : [],
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    const { data } = req.body;
    const { id } = req.params;
    if (!id || !data?.date || !data?.status) return res.status(400).json({ success: false, message: "User ID, date and status are required" });
    await AttendanceService.updateAttendance(id, data, req.user.id);
    return res.status(200).json({ success: true, message: "Attendance updated successfully" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const bulkUpdateAttendance = async (req, res) => {
  try {
    const { data } = req.body;
    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, message: "Attendance records are required" });
    }
    await AttendanceService.bulkUpdateAttendance(data, req.user.id);
    return res.status(200).json({ success: true, message: "Bulk attendance updated successfully" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const { startDate, endDate, classId, studentId } = req.query;
    console.log(`[getAttendance] Query params: startDate=${startDate}, endDate=${endDate}, classId=${classId}, studentId=${studentId}`);
    const records = await AttendanceService.getAttendance(startDate, endDate, classId, studentId);
    console.log(`[getAttendance] Returned ${records.length} records from service.`);
    return res.status(200).json({ success: true, records });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
