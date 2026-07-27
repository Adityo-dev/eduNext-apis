import { Router } from "express";
import { getCourseForPlayback } from "../controllers/getCourseForPlayback.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const playerRouter = Router();

// ─── Student Course Player Routes
playerRouter.get("/courses/:id/play", authenticate, getCourseForPlayback);

export default playerRouter;
