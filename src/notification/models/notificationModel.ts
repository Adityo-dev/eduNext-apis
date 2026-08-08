import { Schema, model } from "mongoose";
import type { INotificationDocument } from "../types/notificationType.js";

const notificationSchema = new Schema<INotificationDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "course_sale",
        "review",
        "course_approved",
        "enrollment",
        "withdrawal_processed",
        "instructor_application",
        "withdrawal_request",
        "course_submitted",
        "support_ticket",
        "user_registered",
        "revenue_milestone",
        "live_session",
        "certificate",
        "lesson",
      ],
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const NotificationModel = model<INotificationDocument>(
  "Notification",
  notificationSchema,
);
export default NotificationModel;
