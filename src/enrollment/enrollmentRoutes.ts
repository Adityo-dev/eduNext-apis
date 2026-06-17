import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  enrollInCourse,
  getMyEnrolledCourses,
} from "./enrollmentController.js";

const enrollmentRouter = Router();

enrollmentRouter.use(authenticate);

enrollmentRouter.post("/enroll", enrollInCourse);

enrollmentRouter.get("/my-enrolled", getMyEnrolledCourses);

export default enrollmentRouter;
   