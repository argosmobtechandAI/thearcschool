import { Router } from "express";
import { auth } from "../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../middlewares/roleMiddleware.js";
import {
  createUser,
  updateUser,
  deleteUser,
  getUsers,
  uploadBulkUser
} from "../shared/users/controller.js";

import {
  createComplaint,
  getComplaints,
  getComplaintById
} from "../shared/complaints/controller.js";

import { classRouter } from "../shared/classes/routes.js";
import subjectRouter from "../shared/subjects/routes.js";
import timeTableRouter from "../shared/timetable/routes.js";
import eventsRouter from "../shared/events/routes.js";
import infoRouter from "../shared/info/routes.js";
import { createDateSheet, getDateSheetGrades, getExam, updateExam, deleteExam } from "../shared/academics/examsController.js";

const router = Router();

// Allow admin, principal, admission, finance, and accountant to access these routes for shared data
router.use(auth);
router.use(authorizeRoles('admin', 'principal', 'admission', 'finance', 'accountant'));

// --- User Management ---
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.get("/users", getUsers);
router.post("/users/bulk", uploadBulkUser);

// --- Complaint Management ---
router.post("/complaints", createComplaint);
router.get("/complaints", getComplaints);
router.get("/complaints/:id", getComplaintById);

// --- Operations & Academics Modules ---
router.use("/class", classRouter);
router.use("/subjects", subjectRouter);
router.use("/timeTable", timeTableRouter);
router.use("/events", eventsRouter);
router.use("/info", infoRouter);

// --- Exams & Date Sheets ---
router.post("/exams/datesheet", createDateSheet);
router.get("/exams/datesheet/:title/:class_id/grades", getDateSheetGrades);
router.get("/exams", getExam);
router.delete("/exams/deleteExams/:id", deleteExam);
router.put("/exams/updateExams/:id", updateExam);

export default router;
