import { Schema, model, Document } from "mongoose";

export interface IContactMessage extends Document {
  fullName: string;
  email: string;
  subject: string;
  message: string;
  status: "unread" | "read" | "replied";
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContactMessage>(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
    },
    status: {
      type: String,
      enum: ["unread", "read", "replied"],
      default: "unread",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const ContactModel = model<IContactMessage>("Contact", contactSchema);

export default ContactModel;
