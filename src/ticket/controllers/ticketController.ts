import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { getIo } from "../../config/socket.js";
import TicketMessageModel from "../models/ticketMessageModel.js";
import TicketModel from "../models/ticketModel.js";

// Create a new ticket
export const createTicket = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { title, category, priority, targetRole, assignedTo, courseId, message } =
      req.body;
    const senderId = req.user.id;
    const senderRole = req.user.role;

    if (!title || !category || !targetRole || !message) {
      return next(
        createHttpError(
          400,
          "Title, category, targetRole, and initial message are required.",
        ),
      );
    }

    // Create the ticket
    const newTicket = await TicketModel.create({
      title,
      category,
      priority: priority || "medium",
      senderId,
      senderRole,
      targetRole,
      assignedTo: assignedTo || null,
      courseId: courseId || null,
    });

    // Create the initial message
    const initialMessage = await TicketMessageModel.create({
      ticketId: newTicket._id,
      senderId,
      message,
    });

    res.status(201).json({
      success: true,
      message: "Support ticket created successfully.",
      ticket: newTicket,
      initialMessage,
    });
  } catch (error) {
    next(error);
  }
};

// Get all tickets for the logged-in user
export const getTickets = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = {};

    if (userRole === "admin") {
      // Admins can see tickets targeted to "admin", OR if they created them
      query = {
        $or: [{ targetRole: "admin" }, { senderId: userId }],
      };
    } else if (userRole === "instructor") {
      // Instructors can see tickets targeted to "instructor" (or specifically assigned to them) OR if they created them
      query = {
        $or: [
          { targetRole: "instructor" }, // Depending on privacy, this might need to check 'assignedTo' specifically
          { senderId: userId },
        ],
      };
    } else {
      // Students can only see their own tickets
      query = { senderId: userId };
    }

    const tickets = await TicketModel.find(query)
      .populate("senderId", "fullName email avatar role")
      .populate("assignedTo", "fullName email avatar role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      tickets,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single ticket with its messages
export const getSingleTicket = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;

    const ticket = await TicketModel.findById(id)
      .populate("senderId", "fullName email avatar role")
      .populate("assignedTo", "fullName email avatar role")
      .populate("courseId", "title slug");

    if (!ticket) {
      return next(createHttpError(404, "Ticket not found."));
    }

    // Auth check: Is the user allowed to view this ticket?
    // Admin can view if targetRole is admin or they are sender
    // Instructor can view if targetRole is instructor or they are sender
    // Student can only view if they are sender
    const userId = req.user.id;
    const userRole = req.user.role;

    const isSender = ticket.senderId._id.toString() === userId;
    const isTargetAdmin = ticket.targetRole === "admin" && userRole === "admin";
    const isTargetInstructor =
      ticket.targetRole === "instructor" && userRole === "instructor";

    if (!isSender && !isTargetAdmin && !isTargetInstructor) {
      return next(
        createHttpError(403, "You do not have permission to view this ticket."),
      );
    }

    // Fetch messages
    const messages = await TicketMessageModel.find({ ticketId: ticket._id })
      .populate("senderId", "fullName email avatar role")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      ticket,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

// Reply to a ticket
export const replyTicket = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const senderId = req.user.id;

    if (!message) {
      return next(createHttpError(400, "Message cannot be empty."));
    }

    const ticket = await TicketModel.findById(id);
    if (!ticket) {
      return next(createHttpError(404, "Ticket not found."));
    }

    if (ticket.status === "closed") {
      return next(
        createHttpError(400, "Cannot reply to a closed ticket."),
      );
    }

    const newMessage = await TicketMessageModel.create({
      ticketId: ticket._id,
      senderId,
      message,
    });

    // Populate sender details for the real-time event
    await newMessage.populate("senderId", "fullName email avatar role");

    // Emit socket event to room `id`
    const io = getIo();
    io.to(id as string).emit("newMessage", newMessage);

    // If ticket was resolved and a user replies, maybe set it back to open?
    if (ticket.status === "resolved") {
      ticket.status = "open";
      await ticket.save();
    }

    res.status(201).json({
      success: true,
      message: "Reply added successfully.",
      reply: newMessage,
    });
  } catch (error) {
    next(error);
  }
};

// Update ticket status
export const updateTicketStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["open", "resolved", "closed"].includes(status)) {
      return next(createHttpError(400, "Invalid status."));
    }

    const ticket = await TicketModel.findById(id);
    if (!ticket) {
      return next(createHttpError(404, "Ticket not found."));
    }

    // Only allow admin or target instructor to change status (or maybe sender can close it)
    ticket.status = status;
    await ticket.save();

    // Emit socket event for status update
    const io = getIo();
    io.to(id as string).emit("ticketStatusUpdated", { ticketId: id, status });

    res.status(200).json({
      success: true,
      message: `Ticket status updated to ${status}.`,
      ticket,
    });
  } catch (error) {
    next(error);
  }
};
