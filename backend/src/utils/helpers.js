import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { supabase } from "../config/supabaseClient.js";

dotenv.config();

export const generateToken = async (data, type) => {
  let token = jwt.sign(data, process.env.JWT_SECRET);
  return token;
};

export const calculateStudentScore = async (student) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Attendance Score
  let attendanceCount = 0;

  if (Array.isArray(student?.attendance)) {
    attendanceCount = student.attendance.filter(
      (a) => new Date(a.date) >= sevenDaysAgo && a.status === "present"
    ).length;
  }

  // Complaint Count
  let complaintCount = 0;

  if (Array.isArray(student?.complaints) && student.complaints.length > 0) {
    // Convert to numbers and remove invalid values
    const complaintIds = student.complaints
      .map((id) => Number(id))
      .filter((id) => !isNaN(id));

    if (complaintIds.length > 0) {
      const { data: complaints, error } = await supabase
        .from("complaints")
        .select("*")
        .in("id", complaintIds);

      if (!error && complaints) {
        complaintCount = complaints.filter(
          (c) => new Date(c.date) >= sevenDaysAgo
        ).length;
      } else {
        complaintCount = 0;
      }
    } else {
      complaintCount = 0;
    }
  } else {
    complaintCount = 0;
  }

  // Final Score Formula
  const score = attendanceCount * 10 - complaintCount * 5;

  return score;
};
