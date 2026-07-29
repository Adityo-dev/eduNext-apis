import { Schema, model } from "mongoose";
import type { ITicketDocument } from "../types/ticketType.js";

const ticketSchema = new Schema<ITicketDocument>(
  {
    ticketId: {
      type: String,
      required: [true, "Ticket ID is required"],
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["open", "resolved", "closed"],
      default: "open",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["student", "instructor", "admin"],
      required: true,
    },
    targetRole: {
      type: String,
      enum: ["admin", "instructor"],
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Auto generate ticketId before save if not present
ticketSchema.pre("validate", function (next: any) {
  if (!this.ticketId) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    this.ticketId = `TKT-${randomNum}`;
  }
  if (next) next();
});

const TicketModel = model<ITicketDocument>("Ticket", ticketSchema);
export default TicketModel;
