import { Router } from "express";
import { auth } from "../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../middlewares/roleMiddleware.js";

import { getStudentExams } from "../shared/academics/examsController.js";
import { getStudentAttendance } from "../shared/attendance/controller.js";
import { getStudentFees } from "../shared/finance/controller.js";
import { getStudentCourses } from "../shared/academics/courseController.js";
import { getStudentTimetable } from "../shared/timetable/controller.js";

import { getAllEvents } from "../shared/events/controller.js";
import communicationRouter from "../shared/communication/routes.js";

const studentRouter = Router();

// Protect all routes for students and parents only
studentRouter.use(auth);
studentRouter.use(authorizeRoles('student', 'parent'));

studentRouter.get("/exams", getStudentExams);
studentRouter.get("/attendance", getStudentAttendance);
studentRouter.get("/fees", getStudentFees);
studentRouter.get("/course", getStudentCourses);
studentRouter.get("/timetable", getStudentTimetable);

// Read-only global access
studentRouter.get("/events", getAllEvents);

// Chat
studentRouter.use("/communication", communicationRouter);

export default studentRouter;
