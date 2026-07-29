import { Document, Types } from "mongoose";

export interface ITicketDocument extends Document {
  ticketId: string;
  title: string;
  category: string;
  status: "open" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  senderId: Types.ObjectId;
  senderRole: "student" | "instructor" | "admin";
  targetRole: "admin" | "instructor";
  assignedTo?: Types.ObjectId;
  courseId?: Types.ObjectId;
  hasUnreadSender: boolean;
  hasUnreadTarget: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITicketMessageDocument extends Document {
  ticketId: Types.ObjectId;
  senderId: Types.ObjectId;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}
