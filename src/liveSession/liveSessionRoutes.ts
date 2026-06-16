import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import {
  createLiveSession,
  getCourseLiveSessions,
  getInstructorDashboardLiveSessions,
  getInstructorLiveSessionsStats,
  getStudentDashboardLiveSessions,
  getStudentLiveSessionsStats,
  updateLiveSession,
} from "./liveSessionController.js";

const liveSessionRouter = Router();

// Apply base authentication
liveSessionRouter.use(authenticate);

liveSessionRouter.get(
  "/student/stats",
  authorize(["student"]),
  getStudentLiveSessionsStats,
);

liveSessionRouter.get(
  "/instructor/stats",
  authorize(["instructor"]),
  getInstructorLiveSessionsStats,
);

// Global Live Dashboard Endpoints (Role Specific)
liveSessionRouter.get(
  "/student/dashboard",
  authorize(["student"]),
  getStudentDashboardLiveSessions,
);
liveSessionRouter.get(
  "/instructor/dashboard",
  authorize(["instructor"]),
  getInstructorDashboardLiveSessions,
);

// Course Specific Listings (Accessible by both roles based on enrollment/ownership)
liveSessionRouter.get(
  "/course/:courseId",
  authorize(["instructor", "student"]),
  getCourseLiveSessions,
);

// Session Modification Protection (Instructors Only)
liveSessionRouter.post("/", authorize(["instructor"]), createLiveSession);

liveSessionRouter.patch(
  "/:sessionId",
  authorize(["instructor"]),
  updateLiveSession,
);

export default liveSessionRouter;
