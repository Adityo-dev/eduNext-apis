import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { getCommissionRate } from "../controllers/admin/getCommissionRate.controller.js";
import { getCommissionStats } from "../controllers/admin/getCommissionStats.controller.js";
import { updateCommissionRate } from "../controllers/admin/updateCommissionRate.controller.js";
import { getCommissionRateForInstructor } from "../controllers/instructor/getCommissionRateForInstructor.controller.js";

const router = Router();

// Admin: get overall commission stats
router.get(
  "/commission/stats",
  authenticate,
  authorize(["admin"]),
  getCommissionStats,
);

// Admin: get full commission history
router.get(
  "/commission",
  authenticate,
  authorize(["admin"]),
  getCommissionRate,
);

// Instructor  get current commission rate only
router.get(
  "/commission/current",
  authenticate,
  authorize(["instructor"]),
  getCommissionRateForInstructor,
);

// Admin can update commission rate only
router.put(
  "/commission",
  authenticate,
  authorize(["admin"]),
  updateCommissionRate,
);

export const commissionRoutes = router;
