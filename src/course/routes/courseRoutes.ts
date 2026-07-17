import { Router } from "express";
import {
  getInstructorAnalyticsStats,
  getInstructorAnalyticsGrowth,
  getInstructorRevenueOverview,
  getInstructorCoursePerformance,
} from "../controllers/courseAnalyticsController.js";

import {
  authenticate,
  authorize,
  optionalAuthenticate,
} from "../../middlewares/auth.middleware.js";
import {
  createCourse,
  deleteCourse,
  getAllCourses,
  getAllCoursesAdmin,
  getCourseBySlug,
  getCoursesManagementStats,
  getInstructorCourses,
  getInstructorCourseStats,
  requestCoursePublish,
  updateCourse,
  updateCourseStatus,
  getCourseForPlayback,
} from "../controllers/courseController.js";

const courseRouter = Router();

// ─── Public Routes
courseRouter.get("/", getAllCourses);
courseRouter.get("/:slug", optionalAuthenticate, getCourseBySlug);
courseRouter.get("/:id/play", authenticate, getCourseForPlayback);

// ─── Instructor Routes

// ─── Instructor Analytics Routes
courseRouter.get(
  "/instructor/analytics/stats",
  authenticate,
  authorize(["instructor"]),
  getInstructorAnalyticsStats,
);

courseRouter.get(
  "/instructor/analytics/growth",
  authenticate,
  authorize(["instructor"]),
  getInstructorAnalyticsGrowth,
);

courseRouter.get(
  "/instructor/analytics/revenue-overview",
  authenticate,
  authorize(["instructor"]),
  getInstructorRevenueOverview,
);
courseRouter.get(
  "/instructor/analytics/performance",
  authenticate,
  authorize(["instructor"]),
  getInstructorCoursePerformance,
);
courseRouter.post("/", authenticate, authorize(["instructor"]), createCourse);
courseRouter.get(
  "/instructor/my-courses",
  authenticate,
  authorize(["instructor"]),
  getInstructorCourses,
);
courseRouter.get(
  "/instructor/course-stats",
  authenticate,
  authorize(["instructor"]),
  getInstructorCourseStats,
);
courseRouter.patch(
  "/:id",
  authenticate,
  authorize(["instructor"]),
  updateCourse,
);
courseRouter.delete(
  "/:id",
  authenticate,
  authorize(["instructor", "admin"]),
  deleteCourse,
);
courseRouter.post(
  "/:id/publish-request",
  authenticate,
  authorize(["instructor"]),
  requestCoursePublish,
);

// ─── Admin Routes
courseRouter.patch(
  "/:id/status",
  authenticate,
  authorize(["admin"]),
  updateCourseStatus,
);

courseRouter.get(
  "/admin/courses",
  authenticate,
  authorize(["admin"]),
  getAllCoursesAdmin,
);

courseRouter.get(
  "/admin/course-stats",
  authenticate,
  authorize(["admin"]),
  getCoursesManagementStats,
);

export default courseRouter;
