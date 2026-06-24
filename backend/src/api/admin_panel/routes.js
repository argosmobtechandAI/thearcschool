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
import plannerRouter from "./planner/routes.js";
import infoRouter from "../shared/info/routes.js";
import { createDateSheet, getDateSheetGrades, getExam, updateExam, deleteExam, bulkUpdateGrades } from "../shared/academics/examsController.js";
import { getAggregatedResults } from "./resultsController.js";
import { createRole, getRoles, updateRole, deleteRole } from "./rolesController.js";
import { getGradingScales, createGradingScale, updateGradingScale, deleteGradingScale } from "./gradingScalesController.js";
import notificationsRouter from "../shared/notifications/routes.js";

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
import { getSubjectTeachers, assignSubjectTeacher } from "./subjectTeachers.js";

router.use("/class", classRouter);
router.use("/subjects", subjectRouter);
router.use("/timeTable", timeTableRouter);
router.use("/planner", plannerRouter);
router.use("/info", infoRouter);

router.get("/subjectTeachers", getSubjectTeachers);
router.post("/subjectTeachers/assign", assignSubjectTeacher);

// --- Exams & Date Sheets & Results ---
router.post("/exams/datesheet", createDateSheet);
router.get("/exams/datesheet/:title/:class_id/grades", getDateSheetGrades);
router.post("/exams/datesheet/:title/:class_id/grades/bulk", bulkUpdateGrades);
router.get("/exams", getExam);
router.delete("/exams/deleteExams/:id", deleteExam);
router.put("/exams/updateExams/:id", updateExam);
router.get("/results", getAggregatedResults);

// --- Staff Roles & Responsibilities ---
router.post("/roles", createRole);
router.get("/roles", getRoles);
router.put("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);

// --- Grading Scales ---
router.get("/grading-scales", getGradingScales);
router.post("/grading-scales", createGradingScale);
router.put("/grading-scales/:id", updateGradingScale);
router.delete("/grading-scales/:id", deleteGradingScale);

// --- Notifications ---
router.use("/notifications", notificationsRouter);

// --- Communication (Admin Monitoring) ---
import adminCommunicationRouter from "./communication/routes.js";
router.use("/communication", adminCommunicationRouter);

// --- Consents ---
import consentRouter from "../shared/consents/routes.js";
router.use("/consents", consentRouter);

export default router;
