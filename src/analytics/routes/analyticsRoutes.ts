import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { getInstructorAnalyticsGrowth } from "../controllers/instructor/getInstructorAnalyticsGrowth.controller.js";
import { getInstructorAnalyticsStats } from "../controllers/instructor/getInstructorAnalyticsStats.controller.js";
import { getInstructorCoursePerformance } from "../controllers/instructor/getInstructorCoursePerformance.controller.js";
import { getInstructorRevenueOverview } from "../controllers/instructor/getInstructorRevenueOverview.controller.js";

const analyticsRouter = Router();

// ─── Instructor Analytics Routes
analyticsRouter.get(
  "/instructor/stats",
  authenticate,
  authorize(["instructor"]),
  getInstructorAnalyticsStats,
);

analyticsRouter.get(
  "/instructor/growth",
  authenticate,
  authorize(["instructor"]),
  getInstructorAnalyticsGrowth,
);

analyticsRouter.get(
  "/instructor/revenue-overview",
  authenticate,
  authorize(["instructor"]),
  getInstructorRevenueOverview,
);

analyticsRouter.get(
  "/instructor/performance",
  authenticate,
  authorize(["instructor"]),
  getInstructorCoursePerformance,
);

export default analyticsRouter;
