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
    const { amount, method } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid withdrawal amount",
      });
    }

    if (!method || !["bank", "bkash", "nagad"].includes(method)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid withdrawal method (bank, bkash, nagad)",
      });
    }

    const instructor =
      await AuthModel.findById(instructorId).select("payoutSettings");

    // Check if the selected method actually has data saved in the profile
    const selectedPayoutData =
      instructor?.payoutSettings?.[
        method as keyof typeof instructor.payoutSettings
      ];

    if (!instructor || !instructor.payoutSettings || !selectedPayoutData) {
      return res.status(400).json({
        success: false,
        message: `You must set up your ${method} details in your payout settings before requesting a withdrawal.`,
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
      payoutDetails: {
        method,
        ...selectedPayoutData,
      },
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
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      WithdrawalModel.find({ instructor: instructorId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WithdrawalModel.countDocuments({ instructor: instructorId }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//  3. Admin — list withdrawal requests (optionally filter by status)
export const getWithdrawals = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const filter: any = status ? { status } : {};

    const [withdrawals, totalCount, statsData] = await Promise.all([
      WithdrawalModel.find(filter)
        .populate("instructor", "fullName email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WithdrawalModel.countDocuments(filter),
      WithdrawalModel.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    let totalPendingRequests = 0;
    let totalPendingAmount = 0;
    let totalApproved = 0;
    let totalRejected = 0;

    statsData.forEach((stat) => {
      if (stat._id === "pending") {
        totalPendingRequests = stat.count;
        totalPendingAmount = stat.totalAmount;
      } else if (stat._id === "approved") {
        totalApproved = stat.count;
      } else if (stat._id === "rejected") {
        totalRejected = stat.count;
      }
    });

    return res.status(200).json({
      success: true,
      message: "Withdrawals fetched successfully",
      data: {
        stats: {
          totalPendingRequests,
          totalPendingAmount,
          totalApproved,
          totalRejected,
        },
        withdrawals,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
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
        "Withdrawal Approved",
        `Your withdrawal request of ৳${withdrawal.amount} has been approved and processed. ${adminTransactionId ? `TrxID: ${adminTransactionId}. ` : ""}${adminNote ? `Note from Admin: ${adminNote}` : ""}`.trim(),
        "withdrawal_processed",
      ).catch(console.error);
    } else {
      sendNotification(
        withdrawal.instructor.toString(),
        "Withdrawal Rejected",
        `Your withdrawal request of ৳${withdrawal.amount} has been rejected. ${adminNote ? `Reason: ${adminNote}` : "Please contact support."}`,
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
