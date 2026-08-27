import { Router } from "express";

import {
  authenticate,
  authorize,
  optionalAuthenticate,
} from "../../middlewares/auth.middleware.js";

import { getAllCoursesAdmin } from "../controllers/admin/getAllCoursesAdmin.controller.js";
import { getCoursesManagementStats } from "../controllers/admin/getCoursesManagementStats.controller.js";
import { updateCourseStatus } from "../controllers/admin/updateCourseStatus.controller.js";
import { createCourse } from "../controllers/instructor/createCourse.controller.js";
import { getInstructorCourses } from "../controllers/instructor/getInstructorCourses.controller.js";
import { getInstructorCourseStats } from "../controllers/instructor/getInstructorCourseStats.controller.js";
import { requestCoursePublish } from "../controllers/instructor/requestCoursePublish.controller.js";
import { updateCourse } from "../controllers/instructor/updateCourse.controller.js";
import { getAllCourses } from "../controllers/public/getAllCourses.controller.js";
import { getCourseBySlug } from "../controllers/public/getCourseBySlug.controller.js";
import { getTopRatedCourses } from "../controllers/public/getTopRatedCourses.controller.js";
import { getRelatedCourses } from "../controllers/public/getRelatedCourses.controller.js";
import { deleteCourse } from "../controllers/shared/deleteCourse.controller.js";

const courseRouter = Router();

// ─── Public Routes
courseRouter.get("/", getAllCourses);
courseRouter.get("/top-rated", getTopRatedCourses);
courseRouter.get("/:slug/related", getRelatedCourses);
courseRouter.get("/:slug", optionalAuthenticate, getCourseBySlug);

// ─── Instructor Course Management Routes
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

// ─── Admin Course Management Routes
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
