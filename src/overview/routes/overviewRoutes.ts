import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";

// Instructor Overview Controllers
import { getInstructorOverviewStatus } from "../instructor/getInstructorOverviewStatus.controller.js";
import { getInstructorWelcome } from "../instructor/getInstructorWelcome.controller.js";

// Admin Overview Controllers
import { getAdminOverviewStats } from "../admin/getAdminOverviewStats.controller.js";
import { getAdminWelcome } from "../admin/getAdminWelcome.controller.js";
import { getQuickActionStats } from "../admin/getQuickActionStats.controller.js";

// Student Overview Controllers
import { getStudentCourseStats } from "../student/getStudentCourseStats.controller.js";
import { getStudentWelcome } from "../student/getStudentWelcome.controller.js";

const overviewRouter = Router();

//  Student Overview Routes
overviewRouter.get(
  "/student/welcome",
  authenticate,
  authorize(["student"]),
  getStudentWelcome,
);

overviewRouter.get(
  "/student/course-stats",
  authenticate,
  authorize(["student"]),
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
  authenticate,
  authorize(["admin"]),
  getAdminWelcome,
);

overviewRouter.get(
  "/admin/stats",
  authenticate,
  authorize(["admin"]),
  getAdminOverviewStats,
);

overviewRouter.get(
  "/admin/quick-actions",
  authenticate,
  authorize(["admin"]),
  getQuickActionStats,
);

export default overviewRouter;
