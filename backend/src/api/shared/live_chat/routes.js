import express from "express";
import { getLiveChatHistory, getTeachers, getLiveChatsList, getPrincipal, getStudents } from "./controller.js";
import { auth } from "../../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/list", auth, getLiveChatsList);
router.get("/teachers", auth, getTeachers);
router.get("/students", auth, getStudents);
router.get("/principal", auth, getPrincipal);

// Get live chat history between two users
router.get("/history/:userId", auth, getLiveChatHistory);

export default router;
