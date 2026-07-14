import { Schema, model } from "mongoose";
import type { IWithdrawal } from "../types/withdrawal.types.js";

const withdrawalSchema = new Schema<IWithdrawal>(
  {
    instructor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
    payments: [{ type: Schema.Types.ObjectId, ref: "Payment" }],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    accountInfo: { type: String },
    adminNote: { type: String },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, versionKey: false },
);

withdrawalSchema.index({ instructor: 1, status: 1 });

export const WithdrawalModel = model<IWithdrawal>(
  "Withdrawal",
  withdrawalSchema,
);
