import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import {
  createCourse,
  deleteCourse,
  getAllCourses,
  getCourseBySlug,
  getCoursesManagementStats,
  getInstructorCourses,
  updateCourse,
  updateCourseStatus,
} from "./courseController.js";

const courseRouter = Router();

// ─── Public Routes
courseRouter.get("/", getAllCourses);
courseRouter.get("/:slug", getCourseBySlug);

// ─── Instructor Routes
courseRouter.post("/", authenticate, authorize(["instructor"]), createCourse);
courseRouter.get(
  "/instructor/my-courses",
  authenticate,
  authorize(["instructor"]),
  getInstructorCourses,
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

// ─── Admin Routes
courseRouter.patch(
  "/:id/status",
  authenticate,
  authorize(["admin"]),
  updateCourseStatus,
);

courseRouter.get(
  "/admin/course-stats",
  // authenticate,
  // authorize(["admin"]),
  getCoursesManagementStats,
);

export default courseRouter;
