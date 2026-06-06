import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  enrollInCourse,
  getMyEnrolledCourses,
} from "./enrollmentController.js";

const enrollmentRouter = Router();

enrollmentRouter.use(authenticate);

// URL: POST /api/v1/enrollments/enroll
enrollmentRouter.post("/enroll", enrollInCourse);

// URL: GET /api/v1/enrollments/my-enrolled
enrollmentRouter.get("/my-enrolled", getMyEnrolledCourses);

export default enrollmentRouter;
