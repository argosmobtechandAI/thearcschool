import { Router } from "express";
import { auth } from "../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../middlewares/roleMiddleware.js";

// Import Controllers
import { createExams, deleteExam, getExam, updateExam } from "../shared/academics/examsController.js";
import { createCourse, deletecourse, getcourse, submitAnswer, updatecourse } from "../shared/academics/courseController.js";
import { updateAttendance, bulkUpdateAttendance, getAttendance } from "../shared/attendance/controller.js";
import { getTeacherTimetable } from "../shared/timetable/controller.js";

import { getPlannerEvents } from "../admin_panel/planner/controller.js";
import communicationRouter from "../shared/communication/routes.js";

const teacherRouter = Router();

// Protect all routes for teachers, admins, and principals
teacherRouter.use(auth);
teacherRouter.use(authorizeRoles('teacher', 'admin', 'principal'));

// Exams
teacherRouter.post("/exams", createExams);
teacherRouter.get("/exams", getExam);
teacherRouter.put("/exams/:id", updateExam);
teacherRouter.delete("/exams/:id", deleteExam);

// Courses
teacherRouter.post("/course", createCourse);
teacherRouter.get("/course", getcourse);
teacherRouter.put("/course/:id", updatecourse);
teacherRouter.delete("/course/:id", deletecourse);
teacherRouter.put("/course/uploadFile", submitAnswer);

// Attendance
teacherRouter.put("/attendance/:id", updateAttendance);
teacherRouter.post("/attendance/bulk", bulkUpdateAttendance);
teacherRouter.get("/attendance", getAttendance);

// Timetable
teacherRouter.get("/timetable", getTeacherTimetable);

// Events & Info (Read-only)
teacherRouter.get("/events", getPlannerEvents);

// Chat
teacherRouter.use("/communication", communicationRouter);

export default teacherRouter;
