import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { getCourseProgress, markLessonComplete } from "../controllers/progressController.js";

const progressRouter = Router();

// Protect all progress routes
progressRouter.use(authenticate);

// Mark a lesson as complete
progressRouter.post("/:courseId/lesson/:lessonId/complete", markLessonComplete);

// Get progress for a specific course
progressRouter.get("/:courseId", getCourseProgress);

export default progressRouter;
