import nodemailer from "nodemailer";
import { config } from "../config/config.js";

interface EmailOptions {
  email: string;
  subject: string;
  html: string;
}

/**
 * Validates that SMTP App Password environment variables are present
 */
export const verifySMTPConnection = async (): Promise<void> => {
  const { emailUser, emailPass } = config;

  if (!emailUser || !emailPass) {
    console.error(
      "❌ Email service configuration is incomplete. Check EMAIL_USER and EMAIL_PASS variables.",
    );
    return;
  }

  // Verify connection config with Gmail server
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  try {
    await transporter.verify();
    console.log(
      "✅ Gmail SMTP email service configuration successfully validated.",
    );
  } catch (error) {
    console.error("❌ Gmail SMTP Verification Failed:", error);
  }
};

/**
 * @param options { email: string, subject: string, html: string }
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: config.emailUser,
        pass: config.emailPass,
      },
    });

    const mailOptions = {
      from: `EduNext Platform <${config.emailUser}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `✉️ Email successfully sent to: ${options.email} (ID: ${info.messageId})`,
    );
  } catch (error) {
    console.error("❌ Nodemailer Error: Failed to dispatch email.", error);
    throw new Error(
      "Email could not be dispatched. Please verify your SMTP credentials.",
    );
  }
};
