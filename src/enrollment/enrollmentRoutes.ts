import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import {
  getInstructorStudents,
  getInstructorStudentStats,
  getMyBasicStats,
  getMyEnrolledCourses,
} from "./enrollmentController.js";

const enrollmentRouter = Router();

enrollmentRouter.use(authenticate);

enrollmentRouter.get("/my-courses", getMyEnrolledCourses);

enrollmentRouter.get("/my-basic-stats", getMyBasicStats);

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
