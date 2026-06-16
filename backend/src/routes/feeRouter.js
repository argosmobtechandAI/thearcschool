import { Router } from "express";
import { deleteFees, getFees, updateFees } from "../controllers/feeController.js";
import { auth } from "../middlewares/authMiddleware.js";


const feeRouter = Router()

feeRouter.get("/getFees", auth, getFees)

feeRouter.put("/updateFee/:feeId", auth, updateFees)

feeRouter.delete("/deleteFee/:feeId", auth,  deleteFees)

export default feeRouter