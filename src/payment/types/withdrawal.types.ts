import { Document, Types } from "mongoose";

export type WithdrawalStatus = "pending" | "approved" | "rejected";

export interface IWithdrawal extends Document {
  instructor: Types.ObjectId;
  amount: number;
  payments: Types.ObjectId[];
  status: WithdrawalStatus;
  accountInfo?: string;
  adminNote?: string;
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
