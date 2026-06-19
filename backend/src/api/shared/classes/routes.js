import { Router } from "express";
import { addStudent, addTeacher, createClasses, deleteClasses, getClasses, getClassesById, updateClasses } from "./controller.js";
import { auth } from "../../../middlewares/authMiddleware.js";

export const classRouter = Router()

classRouter.post("/createClass", auth, createClasses)

classRouter.get("/getClass", auth, getClasses)

classRouter.get("/getClassById/:id", auth, getClassesById)

classRouter.put("/updateClass", auth, updateClasses)

classRouter.post("/addStudent", auth, addStudent)
 
classRouter.put("/addTeacher", auth, addTeacher)

classRouter.delete("/deleteClass/:id", auth, deleteClasses)
