import nodemailer from "nodemailer";
import { config } from "../config/config.js";

interface EmailOptions {
  email: string;
  subject: string;
  html: string;
}

/**
 * @param options { email: string, subject: string, html: string }
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost || "smtp.gmail.com",
      port: parseInt(config.smtpPort || "587"),
      secure: false,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });

    const mailOptions = {
      from: `"EduNext Platform" <${process.env.SMTP_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(
      `✉️ Email successfully sent to: ${options.email} (MessageID: ${info.messageId})`,
    );
  } catch (error) {
    console.error("❌ Nodemailer Error: Failed to send email.", error);
    throw new Error(
      "Email could not be sent. Please check SMTP configuration.",
    );
  }
};
