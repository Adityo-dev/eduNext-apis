import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { getCourseProgress, markLessonComplete } from "../controllers/progressController.js";
import { submitQuiz } from "../controllers/submitQuiz.controller.js";

const progressRouter = Router();

// Protect all progress routes
progressRouter.use(authenticate);

// Mark a lesson as complete
progressRouter.post("/:courseId/lesson/:lessonId/complete", markLessonComplete);

// Submit a quiz
progressRouter.post("/:courseId/lesson/:lessonId/quiz/:quizId/submit", submitQuiz);

// Get progress for a specific course
progressRouter.get("/:courseId", getCourseProgress);

export default progressRouter;
