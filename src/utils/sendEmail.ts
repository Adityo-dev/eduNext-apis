import { google } from "googleapis";
import nodemailer from "nodemailer";
import { config } from "../config/config.js";

const OAuth2 = google.auth.OAuth2;

interface EmailOptions {
  email: string;
  subject: string;
  html: string;
}

export const verifySMTPConnection = async (): Promise<void> => {
  const { oauthClientId, oauthClientSecret, oauthRefreshToken, oauthEmail } =
    config;

  if (
    !oauthClientId ||
    !oauthClientSecret ||
    !oauthRefreshToken ||
    !oauthEmail
  ) {
    console.error(
      "Gmail OAuth2 configuration is incomplete. Check environment variables.",
    );
    return;
  }
  console.log(
    "Gmail OAuth2 email service configuration successfully validated.",
  );
};

/**
 * Creates and returns an authenticated Nodemailer transport instance
 */
const createTransporter = async () => {
  try {
    const oauth2Client = new OAuth2(
      config.oauthClientId,
      config.oauthClientSecret,
      "https://developers.google.com/oauthplayground",
    );

    oauth2Client.setCredentials({
      refresh_token: config.oauthRefreshToken,
    });

    // Request a fresh, ephemeral access token programmatically
    const accessTokenResponse = await oauth2Client.getAccessToken();
    const accessToken = accessTokenResponse?.token;

    if (!accessToken) {
      throw new Error("Failed to retrieve operational OAuth2 access token.");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: config.oauthEmail,
        clientId: config.oauthClientId,
        clientSecret: config.oauthClientSecret,
        refreshToken: config.oauthRefreshToken,
        accessToken: accessToken,
      },
    } as nodemailer.TransportOptions);

    return transporter;
  } catch (error) {
    console.error("Error setting up secure OAuth2 transporter:", error);
    throw error;
  }
};

/**
 * @param options { email: string, subject: string, html: string }
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `EduNext Platform <${config.oauthEmail}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `Email successfully sent to: ${options.email} (ID: ${info.messageId})`,
    );
  } catch (error) {
    console.error("Nodemailer OAuth2 Error: Failed to send email.", error);
    throw new Error(
      "Email could not be dispatched. Please verify your Gmail API credentials.",
    );
  }
};
