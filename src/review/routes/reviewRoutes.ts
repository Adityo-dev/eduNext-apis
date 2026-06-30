import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import {
  getAllPendingReviews,
  publishReview,
  rejectReview,
} from "../controllers/adminReviewController.js";
import { getInstructorReviews } from "../controllers/instructorReviewController.js";
import { getCourseReviews } from "../controllers/publicReviewController.js";
import { createCourseReview } from "../controllers/studentReviewController.js";

const reviewRouter = Router();

// ─── Public Routes
reviewRouter.get("/course/:courseId", getCourseReviews);

// ─── Authenticated Routes
reviewRouter.use(authenticate);

// ─── Student Routes
reviewRouter.post("/", authorize(["student"]), createCourseReview);

// ─── Instructor Routes
reviewRouter.get(
  "/instructor/dashboard",
  authorize(["instructor"]),
  getInstructorReviews,
);

// ─── Admin Routes
reviewRouter.get("/admin/pending", authorize(["admin"]), getAllPendingReviews);
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

export default reviewRouter;
