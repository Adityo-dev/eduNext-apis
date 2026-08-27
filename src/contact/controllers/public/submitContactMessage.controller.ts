import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import ContactModel from "../../models/contactModel.js";
import { sendEmail } from "../../../utils/sendEmail.js";
import { config } from "../../../config/config.js";

const sendResponse = (
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: unknown,
) => {
  res.status(statusCode).json({ success, message, data });
};

export const submitContactMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { fullName, email, subject, message } = req.body;

    // 1. Validation
    if (!fullName || !email || !subject || !message) {
      return next(createHttpError(400, "All fields are required"));
    }

    // 2. Save message to database
    const newContactMessage = await ContactModel.create({
      fullName,
      email,
      subject,
      message,
    });

    // 3. Send Email Notification to Admin
    // Using the system's sender email as the admin's receiving email.
    if (config.brevoSenderEmail) {
      const emailHtml = `
        <h2>New Contact Message from EduNext</h2>
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
        <br />
        <p><em>To reply to this user, just click "Reply" in your email client.</em></p>
      `;

      // We don't await this so it doesn't block the API response if email is slow
      sendEmail({
        email: config.brevoSenderEmail,
        subject: `New Contact Request: ${subject}`,
        html: emailHtml,
        replyTo: { email: email, name: fullName },
      }).catch((err) => {
        console.error("Failed to send contact notification email:", err);
      });
    }

    // 4. Send success response to the frontend
    sendResponse(res, 201, true, "Message sent successfully", newContactMessage);
  } catch (error) {
    next(error);
  }
};
