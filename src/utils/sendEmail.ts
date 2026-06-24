import { config } from "../config/config.js";

interface EmailOptions {
  email: string;
  subject: string;
  html: string;
}

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Validates that Brevo env variables are present.
 * Call this once on server startup (replaces old verifySMTPConnection).
 */
export const verifySMTPConnection = async (): Promise<void> => {
  const { brevoApiKey, brevoSenderEmail } = config;

  if (!brevoApiKey || !brevoSenderEmail) {
    console.error(
      "❌ Email service configuration is incomplete. Check BREVO_API_KEY and BREVO_SENDER_EMAIL.",
    );
    return;
  }

  console.log("✅ Brevo email service configuration loaded.");
};

/**
 * @param options { email: string, subject: string, html: string }
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": config.brevoApiKey as string,
      },
      body: JSON.stringify({
        sender: {
          name: config.brevoSenderName,
          email: config.brevoSenderEmail,
        },
        to: [{ email: options.email }],
        subject: options.subject,
        htmlContent: options.html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Brevo API responded with ${response.status}: ${errorBody}`,
      );
    }

    const data = await response.json();
    console.log(
      `✉️ Email successfully sent to: ${options.email} (messageId: ${data.messageId})`,
    );
  } catch (error) {
    console.error("❌ Brevo Error: Failed to dispatch email.", error);
    throw new Error(
      "Email could not be dispatched. Please verify your Brevo credentials.",
    );
  }
};
