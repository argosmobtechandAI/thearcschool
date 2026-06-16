import { Router } from "express";
import userRoutes from "./userRoutes.js";
import { classRouter } from "./classRouter.js";
import complaintRouter from "./complaintRouter.js";
import timeTableRouter from "./timeTableRouter.js";
import examsRouter from "./examsRouter.js";
import courseRouter from "./courseRouter.js";
import communicationRouter from "./communicationRouter.js";
import feeRouter from "./feeRouter.js";
import newUserRouter from "./newUserRouter.js";
import eventsRouter from "./eventsRouter.js";
import infoRouter from "./infoRouter.js";
import uploadRouter from "./uploadRouter.js";
import subjectRouter from "./subjectRoutes.js";
import roomRouter from "./roomRoutes.js";

const router = Router();

router.use("/user", userRoutes);
router.use("/class", classRouter);
router.use("/complaint", complaintRouter);
router.use("/timeTable", timeTableRouter);
router.use("/exams", examsRouter);
router.use("/course", courseRouter);
router.use("/communication", communicationRouter);
router.use("/fees", feeRouter);
router.use("/newUser", newUserRouter);
router.use("/events", eventsRouter);
router.use("/info", infoRouter);
router.use("/upload", uploadRouter);
router.use("/subjects", subjectRouter);
router.use("/rooms", roomRouter);

export default router;
