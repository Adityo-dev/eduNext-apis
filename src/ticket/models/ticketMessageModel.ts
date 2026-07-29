import { Schema, model } from "mongoose";
import type { ITicketMessageDocument } from "../types/ticketType.js";

const ticketMessageSchema = new Schema<ITicketMessageDocument>(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const TicketMessageModel = model<ITicketMessageDocument>(
  "TicketMessage",
  ticketMessageSchema,
);
export default TicketMessageModel;
