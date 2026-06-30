import type { Document, Types } from "mongoose";

export interface IReview extends Document {
  student: Types.ObjectId;
  course: Types.ObjectId;
  rating: number;
  comment: string;
  status: "pending" | "published" | "rejected";
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
