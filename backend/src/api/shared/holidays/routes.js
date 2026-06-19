import { Router } from "express";
import { getHolidays, createHoliday, deleteHoliday } from "./controller.js";

const router = Router();

// Routes for public holidays
router.get("/", getHolidays);
router.post("/", createHoliday);
router.delete("/:id", deleteHoliday);

export default router;
