import crypto from "crypto";
import mongoose from "mongoose";
import type { Request, Response } from "express";

import AuthModel from "../../auth/models/authModel.js";
import { GlobalSettingModel } from "../../commissionRate/models/commissionRate.model.js";
import CourseModel from "../../course/models/courseModel.js";
import { EnrollmentModel } from "../../enrollment/enrollmentModel.js";
import { PaymentModel } from "../models/payment.model.js";
import { sslcommerzService } from "../services/sslcommerz.service.js";

const REFUND_WINDOW_DAYS = 7;
const DEFAULT_COMMISSION_RATE = 10;

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL as string;
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL as string;

function generateTranId() {
  return `EDU-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

// ─── 1. Student initiates payment for a course ─────────────────────────────
export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { courseId } = req.params;

    const [student, course] = await Promise.all([
      AuthModel.findById(studentId),
      CourseModel.findById(courseId),
    ]);

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }
    if (!course || course.status !== "published") {
      return res
        .status(404)
        .json({ success: false, message: "Course not available" });
    }
    if (String(course.instructor) === String(studentId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot enroll in your own course",
      });
    }

    const alreadyEnrolled = await EnrollmentModel.findOne({
      student: studentId,
      course: courseId,
      paymentStatus: { $in: ["pending", "completed"] },
    });
    if (alreadyEnrolled) {
      return res
        .status(400)
        .json({ success: false, message: "Already enrolled in this course" });
    }

    const settings = await GlobalSettingModel.findOne();
    const commissionRate = settings
      ? settings.commissionRate
      : DEFAULT_COMMISSION_RATE;
    const amount = course.price;
    const commissionAmount =
      Math.round(((amount * commissionRate) / 100) * 100) / 100;
    const instructorEarning =
      Math.round((amount - commissionAmount) * 100) / 100;

    const tranId = generateTranId();

    const payment = await PaymentModel.create({
      student: studentId,
      course: course._id,
      instructor: course.instructor,
      tranId,
      amount,
      commissionRate,
      commissionAmount,
      instructorEarning,
      status: "pending",
      payoutStatus: "not_applicable",
    });

    const gatewayResponse = await sslcommerzService.initiatePayment({
      tranId,
      amount,
      customer: {
        name: student.fullName || `${student.firstName} ${student.lastName}`,
        email: student.email,
        phone: student.phone,
      },
      productName: course.title,
      successUrl: `${BACKEND_BASE_URL}/api/v1/payment/success`,
      failUrl: `${BACKEND_BASE_URL}/api/v1/payment/fail`,
      cancelUrl: `${BACKEND_BASE_URL}/api/v1/payment/cancel`,
      ipnUrl: `${BACKEND_BASE_URL}/api/v1/payment/ipn`,
    });

    if (
      gatewayResponse.status !== "SUCCESS" ||
      !gatewayResponse.GatewayPageURL
    ) {
      payment.status = "failed";
      await payment.save();
      return res.status(502).json({
        success: false,
        message: "Failed to initiate payment session with SSLCommerz",
        reason: gatewayResponse.failedreason,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment session created",
      data: {
        paymentUrl: gatewayResponse.GatewayPageURL,
        tranId,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── shared: validate with SSLCommerz + mark payment paid + create enrollment
async function finalizeSuccessfulPayment(tranId: string, valId: string) {
  const payment = await PaymentModel.findOne({ tranId });
  if (!payment) return { ok: false, reason: "Payment record not found" };

  if (payment.status === "paid") return { ok: true, payment };

  const validation = await sslcommerzService.validateTransaction(valId);
  const isValid =
    validation.status === "VALID" || validation.status === "VALIDATED";
  const amountMatches =
    Math.round(parseFloat(validation.amount || "0")) ===
    Math.round(payment.amount);

  if (!isValid || !amountMatches) {
    payment.status = "failed";
    await payment.save();
    return { ok: false, reason: "Validation failed or amount mismatch" };
  }

  payment.valId = valId;
  payment.bankTranId = validation.bank_tran_id;
  payment.status = "paid";
  payment.payoutStatus = "available";
  payment.paidAt = new Date();

  const enrollment = await EnrollmentModel.create({
    student: payment.student,
    course: payment.course,
    pricePaid: payment.amount,
    paymentStatus: "completed",
  });
  payment.enrollment = enrollment._id;
  await payment.save();

  await CourseModel.findByIdAndUpdate(payment.course, {
    $inc: { enrolledCount: 1 },
  });

  return { ok: true, payment };
}

// ─── 2. Browser redirect after successful payment (SSLCommerz POSTs here) ──
export const paymentSuccess = async (req: Request, res: Response) => {
  try {
    const { tran_id, val_id } = req.body || {};
    const result = await finalizeSuccessfulPayment(tran_id, val_id);
    const redirectUrl = result.ok
      ? `${FRONTEND_BASE_URL}/payment/success?tran_id=${tran_id}`
      : `${FRONTEND_BASE_URL}/payment/fail?tran_id=${tran_id}`;
    return res.redirect(303, redirectUrl);
  } catch (error) {
    return res.redirect(303, `${FRONTEND_BASE_URL}/payment/fail`);
  }
};

// ─── 3. Browser redirect after failed payment ───────────────────────────────
export const paymentFail = async (req: Request, res: Response) => {
  try {
    const { tran_id } = req.body;
    if (tran_id) {
      await PaymentModel.findOneAndUpdate(
        { tranId: tran_id, status: "pending" },
        { status: "failed" },
      );
    }
    return res.redirect(
      303,
      `${FRONTEND_BASE_URL}/payment/fail?tran_id=${tran_id || ""}`,
    );
  } catch (error) {
    return res.redirect(303, `${FRONTEND_BASE_URL}/payment/fail`);
  }
};

// ─── 4. Browser redirect after cancelled payment ────────────────────────────
export const paymentCancel = async (req: Request, res: Response) => {
  try {
    const { tran_id } = req.body;
    if (tran_id) {
      await PaymentModel.findOneAndUpdate(
        { tranId: tran_id, status: "pending" },
        { status: "cancelled" },
      );
    }
    return res.redirect(
      303,
      `${FRONTEND_BASE_URL}/payment/cancel?tran_id=${tran_id || ""}`,
    );
  } catch (error) {
    return res.redirect(303, `${FRONTEND_BASE_URL}/payment/cancel`);
  }
};

// ─── 5. Server-to-server IPN listener (SSLCommerz calls this independently) ─
export const paymentIPN = async (req: Request, res: Response) => {
  try {
    const { tran_id, val_id } = req.body || {};
    if (!tran_id || !val_id) {
      return res.status(400).send("Missing tran_id or val_id");
    }
    await finalizeSuccessfulPayment(tran_id, val_id);
    return res.status(200).send("IPN received");
  } catch (error) {
    return res.status(500).send("IPN processing error");
  }
};

// ─── 6. Student — list own payments ─────────────────────────────────────────
export const getMyPayments = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;
    const payments = await PaymentModel.find({ student: studentId })
      .populate("course", "title thumbnail price")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: payments });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 7. Student — request a refund (within REFUND_WINDOW_DAYS of payment) ──
export const requestRefund = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { paymentId } = req.params;
    const { reason } = req.body;

    const query = mongoose.isValidObjectId(paymentId)
      ? { _id: paymentId, student: studentId }
      : { tranId: paymentId, student: studentId };

    const payment = await PaymentModel.findOne(query);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }
    if (payment.status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Only completed payments are eligible for refund",
      });
    }
    if (payment.refund.status !== "none") {
      return res.status(400).json({
        success: false,
        message: "A refund request already exists for this payment",
      });
    }

    const daysSincePaid = payment.paidAt
      ? (Date.now() - payment.paidAt.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    if (daysSincePaid > REFUND_WINDOW_DAYS) {
      return res.status(400).json({
        success: false,
        message: `Refund window of ${REFUND_WINDOW_DAYS} days has expired for this payment`,
      });
    }

    payment.refund.status = "requested";
    payment.refund.reason = reason || "";
    payment.refund.requestedAt = new Date();
    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Refund request submitted",
      data: payment,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 8. Admin — list pending refund requests ────────────────────────────────
export const getRefundRequests = async (req: Request, res: Response) => {
  try {
    const payments = await PaymentModel.find({ "refund.status": "requested" })
      .populate("student", "fullName email phone")
      .populate("course", "title price")
      .sort({ "refund.requestedAt": 1 });
    return res.status(200).json({ success: true, data: payments });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 9. Admin — approve or reject a refund request ──────────────────────────
export const processRefund = async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { paymentId } = req.params;
    const { action, adminNote } = req.body as {
      action: "approve" | "reject";
      adminNote?: string;
    };

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "action must be 'approve' or 'reject'",
      });
    }

    const query = mongoose.isValidObjectId(paymentId)
      ? { _id: paymentId }
      : { tranId: paymentId };

    const payment = await PaymentModel.findOne(query);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }
    if (payment.refund.status !== "requested") {
      return res.status(400).json({
        success: false,
        message: "No pending refund request on this payment",
      });
    }

    if (action === "reject") {
      payment.refund.status = "rejected";
      payment.refund.processedAt = new Date();
      payment.refund.processedBy = adminId as any;
      payment.refund.adminNote = adminNote || "";
      await payment.save();
      return res.status(200).json({
        success: true,
        message: "Refund request rejected",
        data: payment,
      });
    }

    if (payment.payoutStatus === "withdrawn") {
      return res.status(400).json({
        success: false,
        message:
          "Instructor earning for this payment was already withdrawn — recover funds from instructor manually before refunding",
      });
    }
    if (!payment.bankTranId) {
      return res.status(400).json({
        success: false,
        message: "Missing bank_tran_id, cannot process refund",
      });
    }

    const refundResponse = await sslcommerzService.initiateRefund({
      bankTranId: payment.bankTranId,
      refundAmount: payment.amount,
      refundRemarks: adminNote || "Refund approved by admin",
    });

    if (refundResponse.status !== "success") {
      return res.status(502).json({
        success: false,
        message: "SSLCommerz refund initiation failed",
        reason: refundResponse.errorReason,
      });
    }

    payment.refund.status = "refunded";
    payment.refund.processedAt = new Date();
    payment.refund.processedBy = adminId as any;
    payment.refund.adminNote = adminNote || "";
    payment.refund.refundRefId = refundResponse.refund_ref_id;
    payment.refund.refundedAmount = payment.amount;
    payment.status = "refunded";
    payment.payoutStatus = "not_applicable";
    await payment.save();

    await EnrollmentModel.findByIdAndUpdate(payment.enrollment, {
      paymentStatus: "refunded",
    });
    await CourseModel.findByIdAndUpdate(payment.course, {
      $inc: { enrolledCount: -1 },
    });

    return res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      data: payment,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 10. Instructor — earnings summary ──────────────────────────────────────
export const getInstructorEarnings = async (req: Request, res: Response) => {
  try {
    const instructorId = req.user?.id;

    const payments = await PaymentModel.find({
      instructor: instructorId,
      status: { $in: ["paid", "refunded"] },
    })
      .populate("course", "title")
      .sort({ createdAt: -1 });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let totalEarned = 0;
    let available = 0;
    let pendingWithdrawal = 0;
    let withdrawn = 0;
    let holding = 0;
    let totalRefunded = 0;

    payments.forEach((p) => {
      if (p.status === "refunded") {
        totalRefunded += p.instructorEarning;
      } else {
        totalEarned += p.instructorEarning;
        if (p.payoutStatus === "available") {
          if (p.paidAt && p.paidAt <= sevenDaysAgo) {
            available += p.instructorEarning;
          } else {
            holding += p.instructorEarning;
          }
        } else if (p.payoutStatus === "withdrawal_pending") {
          pendingWithdrawal += p.instructorEarning;
        } else if (p.payoutStatus === "withdrawn") {
          withdrawn += p.instructorEarning;
        }
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        totalEarned,
        available,
        holding,
        pendingWithdrawal,
        withdrawn,
        totalRefunded,
        payments,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
