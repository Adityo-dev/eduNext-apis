import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import {
  getCommissionRate,
  updateCommissionRate,
} from "../controllers/commissionRate.controller.js";

const router = Router();

router.get("/commission", authenticate, getCommissionRate);

router.put(
  "/commission",
  authenticate,
  authorize(["admin"]),
  updateCommissionRate,
);

export const commissionRoutes = router;
