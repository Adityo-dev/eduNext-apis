import { Router } from "express";
import { getInstructorAnalyticsStats } from "../controllers/instructor/getInstructorAnalyticsStats.controller.js";
import { getInstructorAnalyticsGrowth } from "../controllers/instructor/getInstructorAnalyticsGrowth.controller.js";
import { getInstructorRevenueOverview } from "../controllers/instructor/getInstructorRevenueOverview.controller.js";
import { getInstructorCoursePerformance } from "../controllers/instructor/getInstructorCoursePerformance.controller.js";

import {
  authenticate,
  authorize,
  optionalAuthenticate,
} from "../../middlewares/auth.middleware.js";

import { createCourse } from "../controllers/instructor/createCourse.controller.js";
import { deleteCourse } from "../controllers/shared/deleteCourse.controller.js";
import { getAllCourses } from "../controllers/public/getAllCourses.controller.js";
import { getAllCoursesAdmin } from "../controllers/admin/getAllCoursesAdmin.controller.js";
import { getCourseBySlug } from "../controllers/public/getCourseBySlug.controller.js";
import { getCoursesManagementStats } from "../controllers/admin/getCoursesManagementStats.controller.js";
import { getInstructorCourses } from "../controllers/instructor/getInstructorCourses.controller.js";
import { getInstructorCourseStats } from "../controllers/instructor/getInstructorCourseStats.controller.js";
import { requestCoursePublish } from "../controllers/instructor/requestCoursePublish.controller.js";
import { updateCourse } from "../controllers/instructor/updateCourse.controller.js";
import { updateCourseStatus } from "../controllers/admin/updateCourseStatus.controller.js";
import { getCourseForPlayback } from "../controllers/student/getCourseForPlayback.controller.js";

const courseRouter = Router();

// ─── Public Routes
courseRouter.get("/", getAllCourses);
courseRouter.get("/:slug", optionalAuthenticate, getCourseBySlug);
courseRouter.get("/:id/play", authenticate, getCourseForPlayback);

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
