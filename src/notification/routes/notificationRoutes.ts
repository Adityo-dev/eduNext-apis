import express from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  clearAllNotifications,
  deleteNotification,
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../controllers/notificationController.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getMyNotifications);
router.patch("/read-all", markAllNotificationsAsRead);
router.delete("/all", clearAllNotifications);

router.patch("/:id/read", markNotificationAsRead);
router.delete("/:id", deleteNotification);

export default router;
