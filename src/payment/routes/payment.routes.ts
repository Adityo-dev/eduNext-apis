import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import {
  getInstructorEarnings,
  getWeeklyRevenue,
  getAdminRevenueOverview,
  getMyPayments,
  getRefundRequests,
  initiatePayment,
  paymentCancel,
  paymentFail,
  paymentIPN,
  paymentSuccess,
  processRefund,
  requestRefund,
} from "../controllers/payment.controller.js";

const router = Router();

router.post(
  "/initiate/:courseId",
  authenticate,
  authorize(["student"]),
  initiatePayment,
);
router.get("/my-payments", authenticate, authorize(["student"]), getMyPayments);

// PUBLIC — SSLCommerz callbacks, no auth
router.post("/success", paymentSuccess);
router.post("/fail", paymentFail);
router.post("/cancel", paymentCancel);
router.post("/ipn", paymentIPN);

router.post(
  "/refund/:paymentId",
  authenticate,
  authorize(["student"]),
  requestRefund,
);

router.get(
  "/refund-requests",
  authenticate,
  authorize(["admin"]),
  getRefundRequests,
);
router.put(
  "/refund/:paymentId/process",
  authenticate,
  authorize(["admin"]),
  processRefund,
);

router.get(
  "/admin/revenue-overview",
  authenticate,
  authorize(["admin"]),
  getAdminRevenueOverview,
);

router.get(
  "/instructor/earnings",
  authenticate,
  authorize(["instructor"]),
  getInstructorEarnings,
);

router.get(
  "/instructor/weekly-revenue",
  authenticate,
  authorize(["instructor"]),
  getWeeklyRevenue,
);

export const paymentRoutes = router;
