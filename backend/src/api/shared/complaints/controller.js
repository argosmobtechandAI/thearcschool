import { ComplaintService } from "./service.js";

export const createComplaint = async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ success: false, message: "No data provided" });
    const complaint = await ComplaintService.createComplaint(data);
    return res.status(201).json({ success: true, message: "Complaint created successfully", data: complaint });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getComplaints = async (req, res) => {
  try {
    const complaints = await ComplaintService.getComplaints();
    return res.status(200).json({ success: true, complaint: complaints || [] });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;
    const complaint = await ComplaintService.getComplaintById(id);
    return res.status(200).json({ success: true, complaint });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
