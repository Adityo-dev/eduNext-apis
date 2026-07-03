import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { getPlatformConfig, updatePlatformConfig } from "../controllers/platformConfigController.js";

const platformConfigRouter = Router();

// Public: Get platform config (needed for frontend UI, SEO, Logo, etc.)
platformConfigRouter.get("/", getPlatformConfig);

// Admin Only: Update platform config
platformConfigRouter.patch(
  "/",
  authenticate,
  authorize(["admin"]),
  updatePlatformConfig
);

export default platformConfigRouter;
