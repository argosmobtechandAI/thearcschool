import { Router } from "express";
import { auth } from "../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../middlewares/roleMiddleware.js";

// Import Controllers
import { createExams, deleteExam, getExam, updateExam, bulkUpdateGrades, getStudentGrades } from "../shared/academics/examsController.js";
import { createCourse, deletecourse, getcourse, submitAnswer, updatecourse } from "../shared/academics/courseController.js";

import { getTeacherTimetable } from "../shared/timetable/controller.js";
import { getClassStudents, getTeacherClasses } from "../shared/classes/controller.js";

import { getPlannerEvents } from "../admin_panel/planner/controller.js";
import communicationRouter from "../shared/communication/routes.js";
import { getTeacherProfile } from "./controller.js";

const teacherRouter = Router();

// Protect all routes for teachers, admins, and principals
teacherRouter.use(auth);
teacherRouter.use(authorizeRoles('teacher', 'admin', 'principal'));

// Exams
teacherRouter.post("/exams/grades/bulk", bulkUpdateGrades);
teacherRouter.post("/exams", createExams);
teacherRouter.get("/exams", getExam);
teacherRouter.get("/exams/grades", getStudentGrades);
teacherRouter.put("/exams/:id", updateExam);
teacherRouter.delete("/exams/:id", deleteExam);

// Courses
teacherRouter.post("/course", createCourse);
teacherRouter.get("/course", getcourse);
teacherRouter.put("/course/:id", updatecourse);
teacherRouter.delete("/course/:id", deletecourse);
teacherRouter.put("/course/uploadFile", submitAnswer);

// Attendance endpoints moved to /api/attendance

// Timetable
teacherRouter.get("/timetable", getTeacherTimetable);

// Classes (Students)
teacherRouter.get("/classes", getTeacherClasses);
teacherRouter.get("/classes/:id/students", getClassStudents);

// Teacher Profile / Assignments
teacherRouter.get("/profile", getTeacherProfile);

// Events & Info (Read-only)
teacherRouter.get("/events", getPlannerEvents);

// Complaints / Disciplinary Notes
import { getComplaints } from "../shared/complaints/controller.js";
teacherRouter.get("/complaints", getComplaints);

// Chat
teacherRouter.use("/communication", communicationRouter);

export default teacherRouter;
