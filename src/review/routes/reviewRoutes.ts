import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import {
  deleteReviewAdmin,
  getAdminReviewStats,
  getAllReviews,
  publishReview,
  rejectReview,
} from "../controllers/adminReviewController.js";
import {
  getInstructorMyReviews,
  getInstructorReviewStats,
} from "../controllers/instructorReviewController.js";
import { getCourseReviews } from "../controllers/publicReviewController.js";
import {
  createCourseReview,
  getStudentReviewStats,
  getStudentSubmittedReviews,
  getStudentUnreviewedCourses,
  updateCourseReview,
} from "../controllers/studentReviewController.js";

const reviewRouter = Router();

// ─── Public Routes
reviewRouter.get("/course/:courseId", getCourseReviews);

// ─── Authenticated Routes
reviewRouter.use(authenticate);

// ─── Student Routes
reviewRouter.get("/student/stats", authorize(["student"]), getStudentReviewStats);
reviewRouter.get("/student/submitted", authorize(["student"]), getStudentSubmittedReviews);
reviewRouter.get("/student/unreviewed-courses", authorize(["student"]), getStudentUnreviewedCourses);
reviewRouter.post("/", authorize(["student"]), createCourseReview);
reviewRouter.put("/student/:reviewId", authorize(["student"]), updateCourseReview);

// ─── Instructor Routes
reviewRouter.get("/instructor/stats", authorize(["instructor"]), getInstructorReviewStats);
reviewRouter.get("/instructor/reviews", authorize(["instructor"]), getInstructorMyReviews);

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
reviewRouter.delete("/admin/:reviewId", authorize(["admin"]), deleteReviewAdmin);

export default reviewRouter;
