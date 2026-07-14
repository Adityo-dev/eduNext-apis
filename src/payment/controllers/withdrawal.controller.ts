import type { Request, Response } from "express";
import { PaymentModel } from "../models/payment.model.js";
import { WithdrawalModel } from "../models/withdrawal.model.js";

// ─── 1. Instructor — request withdrawal of the full available balance ──────
export const requestWithdrawal = async (req: Request, res: Response) => {
  try {
    const instructorId = req.user?.id;
    const { accountInfo } = req.body;

    const existingPending = await WithdrawalModel.findOne({
      instructor: instructorId,
      status: "pending",
    });
    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending withdrawal request",
      });
    }

    const availablePayments = await PaymentModel.find({
      instructor: instructorId,
      status: "paid",
      payoutStatus: "available",
    });

    const amount = availablePayments.reduce(
      (sum, p) => sum + p.instructorEarning,
      0,
    );

    if (availablePayments.length === 0 || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "No available balance to withdraw" });
    }

    const withdrawal = await WithdrawalModel.create({
      instructor: instructorId,
      amount,
      payments: availablePayments.map((p) => p._id),
      status: "pending",
      accountInfo: accountInfo || "",
    });

    await PaymentModel.updateMany(
      { _id: { $in: availablePayments.map((p) => p._id) } },
      { payoutStatus: "withdrawal_pending" },
    );

    return res.status(201).json({
      success: true,
      message: "Withdrawal request submitted",
      data: withdrawal,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── 2. Instructor — list own withdrawal requests ───────────────────────────
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

// ─── 3. Admin — list withdrawal requests (optionally filter by status) ─────
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

// ─── 4. Admin — approve or reject a withdrawal request ──────────────────────
export const processWithdrawal = async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.id;
    const { withdrawalId } = req.params;
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
      await PaymentModel.updateMany(
        { _id: { $in: withdrawal.payments } },
        { payoutStatus: "withdrawn" },
      );
      withdrawal.status = "approved";
    } else {
      await PaymentModel.updateMany(
        { _id: { $in: withdrawal.payments } },
        { payoutStatus: "available" },
      );
      withdrawal.status = "rejected";
    }

    withdrawal.processedAt = new Date();
    withdrawal.processedBy = adminId as any;
    withdrawal.adminNote = adminNote || "";
    await withdrawal.save();

    return res.status(200).json({
      success: true,
      message: `Withdrawal ${action === "approve" ? "approved and marked as paid" : "rejected"}`,
      data: withdrawal,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
