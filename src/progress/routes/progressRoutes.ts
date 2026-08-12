import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  getCourseProgress,
  markLessonComplete,
} from "../controllers/progressController.js";
import { submitQuiz } from "../controllers/submitQuiz.controller.js";
import { getStudentOverallProgress } from "../controllers/getStudentOverallProgress.controller.js";
import { getStudentSummaryCards } from "../controllers/getStudentSummaryCards.controller.js";
import { getStudentWeeklyActivity } from "../controllers/getStudentWeeklyActivity.controller.js";
import { getStudentAchievements } from "../controllers/getStudentAchievements.controller.js";
import { getStudentWeeklyGoal } from "../controllers/getStudentWeeklyGoal.controller.js";
import { getQuizHistory } from "../controllers/getQuizHistory.controller.js";

const progressRouter = Router();

// Protect all progress routes
progressRouter.use(authenticate);

// ─── Student Dashboard Progress Routes ───
progressRouter.get("/student/overall", getStudentOverallProgress);
progressRouter.get("/student/summary-cards", getStudentSummaryCards);
progressRouter.get("/student/weekly-activity", getStudentWeeklyActivity);
progressRouter.get("/student/achievements", getStudentAchievements);
progressRouter.get("/student/weekly-goal", getStudentWeeklyGoal);
progressRouter.get("/student/quiz-history", getQuizHistory);

// Mark a lesson as complete
progressRouter.post("/:courseId/lesson/:lessonId/complete", markLessonComplete);

// Submit a quiz
progressRouter.post(
  "/:courseId/lesson/:lessonId/quiz/:quizId/submit",
  submitQuiz,
);

// Get progress for a specific course
progressRouter.get("/:courseId", getCourseProgress);

export default progressRouter;
