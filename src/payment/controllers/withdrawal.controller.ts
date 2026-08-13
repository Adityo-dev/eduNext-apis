import type { Request, Response } from "express";
import { PaymentModel } from "../models/payment.model.js";
import { WithdrawalModel } from "../models/withdrawal.model.js";
import AuthModel from "../../auth/models/authModel.js";
import {
  sendAdminNotification,
  sendNotification,
} from "../../notification/services/notificationService.js";

//  1. Instructor — request withdrawal of a specific amount
export const requestWithdrawal = async (req: Request, res: Response) => {
  try {
    const instructorId = req.user?.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid withdrawal amount",
      });
    }

    const instructor =
      await AuthModel.findById(instructorId).select("payoutSettings");
    if (
      !instructor ||
      !instructor.payoutSettings ||
      !instructor.payoutSettings.method
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You must set up your payout settings in your profile before requesting a withdrawal.",
      });
    }

    const existingPending = await WithdrawalModel.findOne({
      instructor: instructorId,
      status: "pending",
    });
    if (existingPending) {
      return res.status(400).json({
        success: false,
        message:
          "You already have a pending withdrawal request. Please wait for it to be processed.",
      });
    }

    // Dynamic Balance Calculation
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const allPayments = await PaymentModel.find({
      instructor: instructorId,
      status: "paid",
    });

    let totalEarned = 0;
    let holding = 0;

    allPayments.forEach((p) => {
      totalEarned += p.instructorEarning;
      if (!p.paidAt || p.paidAt > sevenDaysAgo) {
        holding += p.instructorEarning;
      }
    });

    const withdrawals = await WithdrawalModel.find({
      instructor: instructorId,
    });
    let withdrawn = 0;
    let pendingWithdrawal = 0;

    withdrawals.forEach((w) => {
      if (w.status === "approved") {
        withdrawn += w.amount;
      } else if (w.status === "pending") {
        pendingWithdrawal += w.amount;
      }
    });

    const available = totalEarned - holding - withdrawn - pendingWithdrawal;

    if (amount > available) {
      return res.status(400).json({
        success: false,
        message: `Insufficient available balance. You can withdraw up to $${available}.`,
      });
    }

    const withdrawal = await WithdrawalModel.create({
      instructor: instructorId,
      amount,
      status: "pending",
      payoutDetails: instructor.payoutSettings,
    });

    sendAdminNotification(
      "Withdrawal Request",
      `An instructor has requested a withdrawal of $${amount}.`,
      "withdrawal_request",
    ).catch(console.error);

    return res.status(201).json({
      success: true,
      message: "Withdrawal request submitted successfully",
      data: withdrawal,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  2. Instructor — list own withdrawal requests
export const getMyWithdrawals = async (req: Request, res: Response) => {
  try {
    const instructorId = req.user?.id;
    const withdrawals = await WithdrawalModel.find({
      instructor: instructorId,
    }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: withdrawals });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  3. Admin — list withdrawal requests (optionally filter by status)
export const getWithdrawals = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const filter: any = status ? { status } : {};
    const withdrawals = await WithdrawalModel.find(filter)
      .populate("instructor", "fullName email phone")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: withdrawals });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  4. Admin — approve or reject a withdrawal request
export const processWithdrawal = async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { withdrawalId } = req.params;
    const { action, adminNote, adminTransactionId } = req.body as {
      action: "approve" | "reject";
      adminNote?: string;
      adminTransactionId?: string;
    };

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "action must be 'approve' or 'reject'",
      });
    }

    const withdrawal = await WithdrawalModel.findById(withdrawalId);
    if (!withdrawal) {
      return res
        .status(404)
        .json({ success: false, message: "Withdrawal request not found" });
    }
    if (withdrawal.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This request has already been processed",
      });
    }

    if (action === "approve") {
      withdrawal.status = "approved";
      if (adminTransactionId) {
        withdrawal.adminTransactionId = adminTransactionId;
      }
    } else {
      withdrawal.status = "rejected";
    }

    withdrawal.processedAt = new Date();
    withdrawal.processedBy = adminId as any;
    withdrawal.adminNote = adminNote || "";
    await withdrawal.save();

    if (action === "approve") {
      sendNotification(
        withdrawal.instructor.toString(),
        "Withdrawal Processed",
        `Your withdrawal request of $${withdrawal.amount} has been approved and processed.`,
        "withdrawal_processed",
      ).catch(console.error);
    }

    return res.status(200).json({
      success: true,
      message: `Withdrawal ${action === "approve" ? "approved and marked as paid" : "rejected"}`,
      data: withdrawal,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
