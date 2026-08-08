import NotificationModel from "../models/notificationModel.js";
import AuthModel from "../../auth/models/authModel.js";
import type { Types } from "mongoose";
import { getIo } from "../../config/socket.js";

type NotificationType =
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

export const sendNotification = async (
  userId: string | Types.ObjectId,
  title: string,
  message: string,
  type: NotificationType,
  link?: string,
) => {
  try {
    const newNotification = await NotificationModel.create({
      user: userId,
      title,
      message,
      type,
      link,
    });

    try {
      const io = getIo();
      io.to(userId.toString()).emit("newNotification", newNotification);
    } catch (socketError) {
      // Ignore if socket is not initialized (e.g. during tests)
    }
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
};

export const sendAdminNotification = async (
  title: string,
  message: string,
  type: NotificationType,
  link?: string,
) => {
  try {
    const adminUsers = await AuthModel.find({ role: "admin" }).select("_id");
    const notifications = adminUsers.map((admin) => ({
      user: admin._id,
      title,
      message,
      type,
      link,
    }));

    if (notifications.length > 0) {
      const createdNotifications =
        await NotificationModel.insertMany(notifications);

      try {
        const io = getIo();
        createdNotifications.forEach((notification) => {
          io.to(notification.user.toString()).emit(
            "newNotification",
            notification,
          );
        });
      } catch (socketError) {
        // Ignore socket error
      }
    }
  } catch (error) {
    console.error("Failed to send admin notification:", error);
  }
};
