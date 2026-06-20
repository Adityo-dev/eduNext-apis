import nodemailer from "nodemailer";
import { config } from "../config/config.js";

interface EmailOptions {
  email: string;
  subject: string;
  html: string;
}

/**
 * PERFORMANCE FIX: Transporter is created ONCE at module load time and reused
 * for every email. This avoids a full TCP + TLS handshake on every request.
 * Connection pooling keeps up to 5 SMTP connections alive simultaneously.
 */
export const transporter = nodemailer.createTransport({
  host: config.smtpHost || "smtp.gmail.com",
  port: parseInt(config.smtpPort || "587"),
  secure: false,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
  pool: true, // Reuse existing connections instead of opening new ones
  maxConnections: 5, // Keep up to 5 connections alive
  maxMessages: 100, // Max messages per connection before recycling
});

export const verifySMTPConnection = async () => {
  try {
    await transporter.verify();
    console.log("✅ SMTP Connection established & verified successfully.");
  } catch (error) {
    console.error("❌ SMTP Connection failed during startup:", error);
  }
};

/**
 * @param options { email: string, subject: string, html: string }
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const mailOptions = {
      from: `"EduNext Platform" <${config.smtpUser}>`,
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
