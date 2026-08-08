import { Document, Types } from "mongoose";

export interface INotification {
  user: Types.ObjectId;
  title: string;
  message: string;
  type:
    | "course_sale"
    | "review"
    | "course_approved"
    | "enrollment"
    | "withdrawal_processed"
    | "instructor_application"
    | "withdrawal_request"
    | "course_submitted"
    | "support_ticket"
    | "user_registered"
    | "revenue_milestone"
    | "live_session"
    | "certificate"
    | "lesson";
  isRead: boolean;
  link?: string;
}

export interface INotificationDocument extends INotification, Document {
  createdAt: Date;
  updatedAt: Date;
}
