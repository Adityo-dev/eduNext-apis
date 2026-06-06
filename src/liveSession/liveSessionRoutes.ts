import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import {
  createLiveSession,
  getCourseLiveSessions,
  updateLiveSession,
} from "./liveSessionController.js";

const liveSessionRouter = Router();

liveSessionRouter.use(authenticate, authorize(["instructor"]));

liveSessionRouter.post("/", createLiveSession);

liveSessionRouter.patch("/:sessionId", updateLiveSession);

liveSessionRouter.get("/course/:courseId", getCourseLiveSessions);

export default liveSessionRouter;
