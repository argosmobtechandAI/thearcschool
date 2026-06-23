import { Router } from "express";
import { 
  createTimeTable, 
  getTimeTable, 
  updatePeriod, 
  deletePeriod,
  addPeriod,
  duplicateDay
} from "./controller.js";
import { auth } from "../../../middlewares/authMiddleware.js";


const timeTableRoutr = Router()

timeTableRoutr.post("/createTimeTable", auth, createTimeTable)

timeTableRoutr.get("/getTimeTable", auth, getTimeTable)

timeTableRoutr.post("/addPeriod", auth, addPeriod)

timeTableRoutr.put("/updatePeriod/:id", auth, updatePeriod)

timeTableRoutr.delete("/deletePeriod/:id", auth, deletePeriod)

timeTableRoutr.post("/duplicateDay", auth, duplicateDay)

export default timeTableRoutr