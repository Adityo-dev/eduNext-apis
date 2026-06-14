import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { createCourseReview, getCourseReviews } from "./reviewController.js";
const ReviewRouter = Router();

ReviewRouter.use(authenticate, authorize(["instructor", "student"]));

ReviewRouter.post("/", createCourseReview);
ReviewRouter.get("/course/:courseId", getCourseReviews);

export default ReviewRouter;
