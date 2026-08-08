import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import NotificationModel from "../models/notificationModel.js";

// ─── Fetch Notifications
export const getMyNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;
    const { page = "1", limit = "10", filter = "all" } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, parseInt(limit as string, 10));
    const skip = (pageNum - 1) * limitNum;

    const query: Record<string, any> = { user: userId };
    if (filter === "unread") {
      query.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      NotificationModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      NotificationModel.countDocuments(query),
      NotificationModel.countDocuments({ user: userId, isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: {
        notifications,
        unreadCount,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Mark Single Notification as Read
export const markNotificationAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;
    const { id } = req.params;

    const notification = await NotificationModel.findOneAndUpdate(
      { _id: id, user: userId },
      { isRead: true },
      { new: true },
    );

    if (!notification) {
      return next(createHttpError(404, "Notification not found"));
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Mark All Notifications as Read
export const markAllNotificationsAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;

    await NotificationModel.updateMany(
      { user: userId, isRead: false },
      { isRead: true },
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    next(error);
  }
};

// ─── Delete Single Notification
export const deleteNotification = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;
    const { id } = req.params;

    const notification = await NotificationModel.findOneAndDelete({
      _id: id,
      user: userId,
    });

    if (!notification) {
      return next(createHttpError(404, "Notification not found"));
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ─── Clear All Notifications
export const clearAllNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;

    await NotificationModel.deleteMany({ user: userId });

    res.status(200).json({
      success: true,
      message: "All notifications cleared successfully",
    });
  } catch (error) {
    next(error);
  }
};
