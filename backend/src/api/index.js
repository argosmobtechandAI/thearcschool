import { Router } from "express";

// Shared Domains
import userRoutes from "./shared/users/routes.js";
import uploadRouter from "./shared/upload/routes.js";
import roomRouter from "./shared/rooms/routes.js";
import communicationRouter from "./shared/communication/routes.js";
import attendanceRouter from "./shared/attendance/routes.js";
import thoughtRouter from "./shared/thoughts/routes.js";
import spotlightRouter from "./shared/spotlight/routes.js";
import courseRouter from "./course/routes.js";
import liveChatRouter from "./shared/live_chat/routes.js";
import sharedStudentOfWeekRouter from "./shared/student_of_week/routes.js";
import adminStudentOfWeekRouter from "./admin_panel/student_of_week/routes.js";
import circularsRouter from "./shared/circulars/routes.js";
import galleryRouter from "./shared/gallery/routes.js";

// Admin Web Panel Domains
import adminPanelRouter from "./admin_panel/routes.js";
import financePanelRouter from "./finance_panel/routes.js";
import admissionPanelRouter from "./admission_panel/routes.js";

// Mobile App Domains
import studentAppRouter from "./student_app/routes.js";
import teacherAppRouter from "./teacher_app/routes.js";
import principalAppRouter from "./principal_app/routes.js";

const router = Router();

// Domain-driven API for Admin Web Panel
router.use("/admin_panel", adminPanelRouter);
router.use("/finance_panel", financePanelRouter);
router.use("/admission_panel", admissionPanelRouter);

// Domain-driven API for Mobile Apps
router.use("/student_app", studentAppRouter);
router.use("/teacher_app", teacherAppRouter);
router.use("/principal_app", principalAppRouter);

// Shared Global APIs
// Shared Global APIs

router.use("/course", courseRouter);
router.use("/user", userRoutes);
router.use("/communication", communicationRouter);
router.use("/attendance", attendanceRouter);
router.use("/upload", uploadRouter);
router.use("/rooms", roomRouter);
router.use("/circulars", circularsRouter);
router.use("/gallery", galleryRouter);
router.use("/live_chat", liveChatRouter);
router.use("/thoughts", thoughtRouter);
router.use("/spotlight", spotlightRouter);
router.use("/shared/student-of-week", sharedStudentOfWeekRouter);
router.use("/admin/student-of-week", adminStudentOfWeekRouter);

export default router;
