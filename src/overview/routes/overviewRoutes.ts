import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";

// Instructor Overview Controllers
import { getInstructorWelcome } from "../instructor/getInstructorWelcome.controller.js";
import { getInstructorOverviewStatus } from "../instructor/getInstructorOverviewStatus.controller.js";

// Admin Overview Controllers
import { getAdminWelcome } from "../admin/getAdminWelcome.controller.js";
import { getAdminOverviewStats } from "../admin/getAdminOverviewStats.controller.js";
import { getQuickActionStats } from "../admin/getQuickActionStats.controller.js";

// Student Overview Controllers
import { getStudentCourseStats } from "../student/getStudentCourseStats.controller.js";

const overviewRouter = Router();

// ─── Student Overview Routes
overviewRouter.get(
  "/student/course-stats",
  authenticate,
  getStudentCourseStats,
);

//  Instructor Overview Routes
overviewRouter.get(
  "/instructor/welcome",
  authenticate,
  authorize(["instructor"]),
  getInstructorWelcome,
);

overviewRouter.get(
  "/instructor/status",
  authenticate,
  authorize(["instructor"]),
  getInstructorOverviewStatus,
);

//  Admin Overview Routes
overviewRouter.get(
  "/admin/welcome",
  // authenticate,
  // authorize(["admin"]),
  getAdminWelcome,
);

overviewRouter.get(
  "/admin/stats",
  // authenticate,
  // authorize(["admin"]),
  getAdminOverviewStats,
);

overviewRouter.get(
  "/admin/quick-actions",
  // authenticate,
  // authorize(["admin"]),
  getQuickActionStats,
);

export default overviewRouter;
