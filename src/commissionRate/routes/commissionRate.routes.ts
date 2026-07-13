import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import {
  getCommissionRate,
  getCommissionRateForInstructor,
  updateCommissionRate,
} from "../controllers/commissionRate.controller.js";

const router = Router();

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

router.put(
  "/commission",
  authenticate,
  authorize(["admin"]),
  updateCommissionRate,
);

export const commissionRoutes = router;
