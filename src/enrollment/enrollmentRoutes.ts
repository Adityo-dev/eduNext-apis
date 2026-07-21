import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import {
  enrollInCourse,
  getInstructorStudents,
  getInstructorStudentStats,
  getMyEnrolledCourses,
  getMyStats,
} from "./enrollmentController.js";

const enrollmentRouter = Router();

enrollmentRouter.use(authenticate);

enrollmentRouter.post("/enroll", enrollInCourse);

enrollmentRouter.get("/my-enrolled", getMyEnrolledCourses);

enrollmentRouter.get("/my-stats", getMyStats);

enrollmentRouter.get(
  "/instructor/students/stats",
  authorize(["instructor"]),
  getInstructorStudentStats,
);

enrollmentRouter.get(
  "/instructor/students",
  authorize(["instructor"]),
  getInstructorStudents,
);

export default enrollmentRouter;
