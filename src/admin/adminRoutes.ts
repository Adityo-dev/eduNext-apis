import { Router } from "express";
// import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import {
  deleteUser,
  getAllUsers,
  getInstructorProfile,
  getPendingBadgeRequests,
  approveInstructor,
  cancelBadge,
  getUserManagementStats,
  getOverviewStats,
  getQuickActionStats,
  updateUserStatus,
} from "./adminController.js";

const adminRouter = Router();

// adminRouter.use(authenticate, authorize(["admin"]));
adminRouter.get("/overview-stats", getOverviewStats);
adminRouter.get("/quick-action-stats", getQuickActionStats);
adminRouter.get("/user-stats", getUserManagementStats);
adminRouter.get("/users", getAllUsers);
adminRouter.patch("/users/:id/status", updateUserStatus);
// adminRouter.patch("/instructors/:id/verify", verifyInstructor);
adminRouter.get("/instructors/badge-requests", getPendingBadgeRequests);
adminRouter.get("/instructors/:id", getInstructorProfile);
adminRouter.patch("/instructors/:id/approve", approveInstructor);
adminRouter.patch("/instructors/:id/cancel-badge", cancelBadge);
adminRouter.delete("/users/:id", deleteUser);

export default adminRouter;
