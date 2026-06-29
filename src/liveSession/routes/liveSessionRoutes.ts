import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import {
  createLiveSession,
  updateLiveSession,
} from "../controllers/createSessionController.js";
import {
  getCourseLiveSessions,
  getInstructorDashboardLiveSessions,
  getStudentDashboardLiveSessions,
} from "../controllers/getSessionController.js";
import { joinLiveSession } from "../controllers/joinSessionController.js";
import {
  getInstructorLiveSessionsStats,
  getStudentLiveSessionsStats,
} from "../controllers/statsSessionController.js";

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

// Student join live session route
liveSessionRouter.post(
  "/:sessionId/join",
  authorize(["student"]),
  joinLiveSession,
);

export default liveSessionRouter;
