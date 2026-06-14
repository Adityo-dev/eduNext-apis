import { Router } from "express";
// import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import {
  deleteUser,
  getAllUsers,
  getUserManagementStats,
  updateUserStatus,
  verifyInstructor,
} from "./adminController.js";

const adminRouter = Router();

// adminRouter.use(authenticate, authorize(["admin"]));
adminRouter.get("/user-stats", getUserManagementStats);
adminRouter.get("/users", getAllUsers);
adminRouter.patch("/users/:id/status", updateUserStatus);
adminRouter.patch("/instructors/:id/verify", verifyInstructor);
adminRouter.delete("/users/:id", deleteUser);

export default adminRouter;
