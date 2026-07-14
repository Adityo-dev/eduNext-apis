import { Schema, model } from "mongoose";
import type { IPayment } from "../types/payment.types.js";

const refundSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["none", "requested", "approved", "rejected", "refunded"],
      default: "none",
    },
    reason: { type: String },
    requestedAt: { type: Date },
    processedAt: { type: Date },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    adminNote: { type: String },
    refundRefId: { type: String },
    refundedAmount: { type: Number },
  },
  { _id: false },
);

const paymentSchema = new Schema<IPayment>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    instructor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    enrollment: { type: Schema.Types.ObjectId, ref: "Enrollment" },

    tranId: { type: String, required: true, unique: true },
    valId: { type: String },
    bankTranId: { type: String },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "BDT" },

    commissionRate: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    instructorEarning: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled", "refunded"],
      default: "pending",
    },
    payoutStatus: {
      type: String,
      enum: ["not_applicable", "available", "withdrawal_pending", "withdrawn"],
      default: "not_applicable",
    },

    paidAt: { type: Date },
    refund: { type: refundSchema, default: () => ({ status: "none" }) },
  },
  { timestamps: true, versionKey: false },
);

paymentSchema.index({ student: 1, course: 1 });
paymentSchema.index({ instructor: 1, status: 1, payoutStatus: 1 });
paymentSchema.index({ "refund.status": 1 });

export const PaymentModel = model<IPayment>("Payment", paymentSchema);
