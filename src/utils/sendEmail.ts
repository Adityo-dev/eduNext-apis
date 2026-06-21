import { Resend } from "resend";
import { config } from "../config/config.js";

const resend = new Resend(config.resendApiKey);

interface EmailOptions {
  email: string;
  subject: string;
  html: string;
}

/**
 * Verifies Resend API key is set correctly (call once at server startup)
 */
export const verifySMTPConnection = async () => {
  try {
    if (!config.resendApiKey) {
      console.error("❌ RESEND_API_KEY is missing in environment variables.");
      return;
    }
    console.log("✅ Resend email service configured successfully.");
  } catch (error) {
    console.error("❌ Resend configuration check failed:", error);
  }
};

/**
 * @param options { email: string, subject: string, html: string }
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const { data, error } = await resend.emails.send({
      from: "EduNext Platform <onboarding@resend.dev>",
      to: options.email,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error("❌ Resend Error: Failed to send email.", error);
      throw new Error(
        "Email could not be sent. Please check Resend configuration.",
      );
    }

    console.log(
      `✉️ Email successfully sent to: ${options.email} (ID: ${data?.id})`,
    );
  } catch (error) {
    console.error("❌ Resend Error: Failed to send email.", error);
    throw new Error(
      "Email could not be sent. Please check Resend configuration.",
    );
  }
};
