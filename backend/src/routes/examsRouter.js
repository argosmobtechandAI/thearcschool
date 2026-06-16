import { Router } from "express";
import { createExams, deleteExam, getExam, updateExam } from "../controllers/examsController.js";
import { auth } from "../middlewares/authMiddleware.js";

const examsRouter = Router()

examsRouter.post("/createExams", auth, createExams)

examsRouter.get("/getExams", auth, getExam)

examsRouter.put("/updateExams/:id", auth, updateExam)

examsRouter.delete("/deleteExams/:id", auth, deleteExam)

export default examsRouter