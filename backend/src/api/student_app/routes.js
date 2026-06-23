import { Router } from "express";
import { auth } from "../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../middlewares/roleMiddleware.js";

import { getStudentAcademics } from "./academicsController.js";
import { getStudentAttendance } from "../shared/attendance/controller.js";
import { getStudentFees } from "../shared/finance/controller.js";
import { getStudentCourses } from "../shared/academics/courseController.js";
import { getStudentTimetable } from "../shared/timetable/controller.js";

import { getPlannerEvents } from "../admin_panel/planner/controller.js";
import communicationRouter from "../shared/communication/routes.js";
import { getDashboardData } from "./dashboardController.js";
import { registerToken, getNotificationHistory, markAsRead } from "../shared/notifications/controller.js";

const studentRouter = Router();

// Protect all routes for students and parents only
studentRouter.use(auth);
studentRouter.use(authorizeRoles('student', 'parent'));

studentRouter.get("/exams", getStudentAcademics);
studentRouter.get("/attendance", getStudentAttendance);
studentRouter.get("/fees", getStudentFees);
studentRouter.get("/course", getStudentCourses);
studentRouter.get("/timetable", getStudentTimetable);

// Read-only global access
studentRouter.get("/events", getPlannerEvents);

// Notifications
studentRouter.post('/notifications/register-token', registerToken);
studentRouter.get('/notifications', getNotificationHistory);
studentRouter.put('/notifications/:id/read', markAsRead);

// Dashboard
studentRouter.get("/dashboard", getDashboardData);

// Chat
studentRouter.use("/communication", communicationRouter);

export default studentRouter;
