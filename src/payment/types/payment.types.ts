import { Document, Types } from "mongoose";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";
export type PayoutStatus =
  | "not_applicable"
  | "available"
  | "withdrawal_pending"
  | "withdrawn";
export type RefundStatus =
  | "none"
  | "requested"
  | "approved"
  | "rejected"
  | "refunded";

export interface IRefundInfo {
  status: RefundStatus;
  reason?: string;
  requestedAt?: Date;
  processedAt?: Date;
  processedBy?: Types.ObjectId;
  adminNote?: string;
  refundRefId?: string;
  refundedAmount?: number;
}

export interface IPayment extends Document {
  student: Types.ObjectId;
  course: Types.ObjectId;
  instructor: Types.ObjectId;
  enrollment?: Types.ObjectId;

  tranId: string;
  valId?: string;
  bankTranId?: string;

  amount: number;
  currency: string;
  paymentMethod?: string;

  commissionRate: number;
  commissionAmount: number;
  instructorEarning: number;

  status: PaymentStatus;
  payoutStatus: PayoutStatus;

  paidAt?: Date;
  refund: IRefundInfo;

  createdAt: Date;
  updatedAt: Date;
}
