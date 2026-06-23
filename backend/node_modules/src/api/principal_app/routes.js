import { Router } from "express";
import { auth } from "../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../middlewares/roleMiddleware.js";

// Import global controllers since principal has admin-level read access
import { getExam } from "../shared/academics/examsController.js";
import { getAttendance } from "../shared/attendance/controller.js";
import { getUsers } from "../shared/users/controller.js";
import { getTopper } from "../shared/academics/examsController.js";

import { getTimeTable } from "../shared/timetable/controller.js";
import { getPlannerEvents } from "../admin_panel/planner/controller.js";
import communicationRouter from "../shared/communication/routes.js";

const principalRouter = Router();

// Protect all routes for principal and admin only
principalRouter.use(auth);
principalRouter.use(authorizeRoles('principal', 'admin'));

// Dashboards and Global Views
principalRouter.get("/exams", getExam);
principalRouter.get("/attendance", getAttendance);
principalRouter.get("/users", getUsers);

principalRouter.get("/topper", getTopper);

// Timetable
principalRouter.get("/timetable", getTimeTable);

// Events & Info (Read-only)
principalRouter.get("/events", getPlannerEvents);

// Chat
principalRouter.use("/communication", communicationRouter);

export default principalRouter;
