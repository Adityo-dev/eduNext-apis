import express from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  createTicket,
  getSingleTicket,
  getTickets,
  replyTicket,
  updateTicketStatus,
} from "../controllers/ticketController.js";

const router = express.Router();

// Apply auth middleware to all ticket routes
router.use(authenticate);

router.post("/", createTicket);
router.get("/", getTickets);
router.get("/:id", getSingleTicket);
router.post("/:id/messages", replyTicket);
router.patch("/:id/status", updateTicketStatus);

export default router;
