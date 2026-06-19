import { Router } from "express";
import { deleteFees, getFees, updateFees, addFee } from "../shared/finance/controller.js";
import { auth } from "../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../middlewares/roleMiddleware.js";

import { getStudentLedger, logPayment, getAccountantStats, getDashboardStats, getAllPayments, generateMonthlyFeesController, generateYearlyAMCController, getFeeStructures, updateFeeStructure } from "./controller.js";

const feeRouter = Router();

feeRouter.use(auth);

// View routes accessible to admin, principal, finance, accountant
const viewRoles = ['admin', 'principal', 'finance', 'accountant', 'super_admin'];
const editRoles = ['finance', 'accountant'];

feeRouter.get("/getFees", authorizeRoles(...viewRoles), getFees);
feeRouter.get("/dashboardStats", authorizeRoles(...viewRoles), getDashboardStats);
feeRouter.get("/getAllPayments", authorizeRoles(...viewRoles), getAllPayments);
feeRouter.get("/feeStructures", authorizeRoles(...viewRoles), getFeeStructures);
feeRouter.get("/getStudentLedger/:studentId", authorizeRoles(...viewRoles), getStudentLedger);
feeRouter.get("/accountant/:id/stats", authorizeRoles(...viewRoles), getAccountantStats);

// Write routes accessible ONLY to finance team
feeRouter.post("/createFee", authorizeRoles(...editRoles), addFee);
feeRouter.put("/updateFee/:feeId", authorizeRoles(...editRoles), updateFees);
feeRouter.delete("/deleteFee/:feeId", authorizeRoles(...editRoles), deleteFees);
feeRouter.post("/generateMonthlyFees", authorizeRoles(...editRoles), generateMonthlyFeesController);
feeRouter.post("/generateYearlyAMC", authorizeRoles(...editRoles), generateYearlyAMCController);
feeRouter.put("/feeStructures/:id", authorizeRoles(...editRoles), updateFeeStructure);
feeRouter.post("/logPayment", authorizeRoles(...editRoles), logPayment);

export default feeRouter;