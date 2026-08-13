import { Document, Types } from "mongoose";

export type WithdrawalStatus = "pending" | "approved" | "rejected";

export interface IWithdrawal extends Document {
  instructor: Types.ObjectId;
  amount: number;
  status: WithdrawalStatus;
  payoutDetails?: Record<string, any>;
  adminTransactionId?: string;
  adminNote?: string;
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
