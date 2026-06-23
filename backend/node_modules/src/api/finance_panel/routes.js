import { Router } from "express";

import { auth } from "../../middlewares/authMiddleware.js";
import { authorizeRoles } from "../../middlewares/roleMiddleware.js";

import { getStudentLedger, logPayment, getAccountantStats, getDashboardStats, getAllPayments, getStudentBalances, getFeeStructures, updateFeeStructure, createFeeStructureController, deleteFeeStructureController, getCategories, createCategory, logTransaction, getTransactions, getFinanceDashboard, toggleRevenueAccess, updateTransaction, deleteTransaction, deleteCategory } from "./controller.js";

const feeRouter = Router();

feeRouter.use(auth);

// View routes accessible to admin, principal, finance, accountant
const viewRoles = ['admin', 'principal', 'finance', 'accountant', 'super_admin'];
const editRoles = ['finance', 'accountant'];


feeRouter.get("/dashboardStats", authorizeRoles(...viewRoles), getDashboardStats);
feeRouter.get("/getAllPayments", authorizeRoles(...viewRoles), getAllPayments);
feeRouter.get("/feeStructures", authorizeRoles(...viewRoles), getFeeStructures);
feeRouter.get("/getStudentLedger/:studentId", authorizeRoles(...viewRoles), getStudentLedger);
feeRouter.get("/accountant/:id/stats", authorizeRoles(...viewRoles), getAccountantStats);

// Write routes accessible ONLY to finance team


feeRouter.post("/studentBalances", authorizeRoles(...viewRoles), getStudentBalances);

feeRouter.put("/feeStructures/:id", authorizeRoles(...editRoles), updateFeeStructure);
feeRouter.post("/feeStructures", authorizeRoles(...editRoles), createFeeStructureController);
feeRouter.delete("/feeStructures/:id", authorizeRoles(...editRoles), deleteFeeStructureController);
feeRouter.post("/logPayment", authorizeRoles(...editRoles), logPayment);

// New Finance Ledger Routes
feeRouter.get("/categories", authorizeRoles(...viewRoles), getCategories);
feeRouter.post("/categories", authorizeRoles(...editRoles, 'super_admin'), createCategory);
feeRouter.delete("/categories/:id", authorizeRoles(...editRoles, 'super_admin'), deleteCategory);

feeRouter.post("/transactions", authorizeRoles(...editRoles), logTransaction);
feeRouter.get("/transactions", authorizeRoles(...viewRoles), getTransactions);
feeRouter.put("/transactions/:id", authorizeRoles(...editRoles), updateTransaction);
feeRouter.delete("/transactions/:id", authorizeRoles(...editRoles), deleteTransaction);

// Special Dashboard (Protected by can_view_revenue check in controller)
feeRouter.get("/financeDashboard", authorizeRoles(...viewRoles), getFinanceDashboard);

// Super Admin toggles revenue access
feeRouter.put("/users/:userId/revenue-access", authorizeRoles('super_admin', 'admin'), toggleRevenueAccess);

export default feeRouter;