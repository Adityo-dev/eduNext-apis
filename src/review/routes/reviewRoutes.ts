import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";

// Admin
import { deleteReviewAdmin } from "../controllers/admin/deleteReviewAdmin.controller.js";
import { getAdminReviewStats } from "../controllers/admin/getAdminReviewStats.controller.js";
import { getAllReviews } from "../controllers/admin/getAllReviews.controller.js";
import { publishReview } from "../controllers/admin/publishReview.controller.js";
import { rejectReview } from "../controllers/admin/rejectReview.controller.js";

// Instructor
import { getInstructorMyReviews } from "../controllers/instructor/getInstructorMyReviews.controller.js";
import { getInstructorReviewStats } from "../controllers/instructor/getInstructorReviewStats.controller.js";

// Public
import { getCourseReviews } from "../controllers/public/getCourseReviews.controller.js";

// Student
import { createCourseReview } from "../controllers/student/createCourseReview.controller.js";
import { getStudentReviewStats } from "../controllers/student/getStudentReviewStats.controller.js";
import { getStudentSubmittedReviews } from "../controllers/student/getStudentSubmittedReviews.controller.js";
import { getStudentUnreviewedCourses } from "../controllers/student/getStudentUnreviewedCourses.controller.js";
import { updateCourseReview } from "../controllers/student/updateCourseReview.controller.js";

const reviewRouter = Router();

// ─── Public Routes
reviewRouter.get("/course/:courseId", getCourseReviews);

// ─── Authenticated Routes
reviewRouter.use(authenticate);

// ─── Student Routes
reviewRouter.get(
  "/student/stats",
  authorize(["student"]),
  getStudentReviewStats,
);

reviewRouter.get(
  "/student/submitted",
  authorize(["student"]),
  getStudentSubmittedReviews,
);

reviewRouter.get(
  "/student/unreviewed-courses",
  authorize(["student"]),
  getStudentUnreviewedCourses,
);

reviewRouter.post("/", authorize(["student"]), createCourseReview);

reviewRouter.put(
  "/student/:reviewId",
  authorize(["student"]),
  updateCourseReview,
);

// ─── Instructor Routes
reviewRouter.get(
  "/instructor/stats",
  authorize(["instructor"]),
  getInstructorReviewStats,
);

reviewRouter.get(
  "/instructor/reviews",
  authorize(["instructor"]),
  getInstructorMyReviews,
);

// ─── Admin Routes
reviewRouter.get("/admin/stats", authorize(["admin"]), getAdminReviewStats);

reviewRouter.get("/admin", authorize(["admin"]), getAllReviews);

reviewRouter.patch(
  "/admin/:reviewId/publish",
  authorize(["admin"]),
  publishReview,
);

reviewRouter.patch(
  "/admin/:reviewId/reject",
  authorize(["admin"]),
  rejectReview,
);

reviewRouter.delete(
  "/admin/:reviewId",
  authorize(["admin"]),
  deleteReviewAdmin,
);

export default reviewRouter;
