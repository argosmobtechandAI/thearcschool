import express from "express";
import { getSystemMonitorList, getSystemMonitorHistory } from "./controller.js";
import { auth } from "../../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/monitor", auth, getSystemMonitorList);
router.get("/history/:user1/:user2", auth, getSystemMonitorHistory);

export default router;
