import { Router } from "express";
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
  requestCoursePublish,
  updateCourse,
  updateCourseStatus,
} from "../controllers/courseController.js";

const courseRouter = Router();

// ─── Public Routes
courseRouter.get("/", getAllCourses);
courseRouter.get("/:slug", optionalAuthenticate, getCourseBySlug);

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
courseRouter.post(
  "/:id/publish-request",
  authenticate,
  authorize(["instructor"]),
  requestCoursePublish,
);

// ─── Admin Routes
courseRouter.patch(
  "/:id/status",
  // authenticate,
  // authorize(["admin"]),
  updateCourseStatus,
);

courseRouter.get(
  "/admin/courses",
  // authenticate,
  // authorize(["admin"]),
  getAllCoursesAdmin,
);

courseRouter.get(
  "/admin/course-stats",
  // authenticate,
  // authorize(["admin"]),
  getCoursesManagementStats,
);

export default courseRouter;
