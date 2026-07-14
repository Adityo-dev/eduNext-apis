import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import {
  getMyWithdrawals,
  getWithdrawals,
  processWithdrawal,
  requestWithdrawal,
} from "../controllers/withdrawal.controller.js";

const router = Router();

router.post("/", authenticate, authorize(["instructor"]), requestWithdrawal);
router.get(
  "/my-requests",
  authenticate,
  authorize(["instructor"]),
  getMyWithdrawals,
);

router.get("/", authenticate, authorize(["admin"]), getWithdrawals);
router.put(
  "/:withdrawalId/process",
  authenticate,
  authorize(["admin"]),
  processWithdrawal,
);

export const withdrawalRoutes = router;
