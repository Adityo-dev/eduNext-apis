import { config as conf } from "dotenv";
conf();

const _config = {
  port: process.env.PORT,
  databaseUrl: process.env.MONGO_CONNECTION_STRING,
  env: process.env.NODE_ENV,
  jwtSecret: process.env.JWT_SECRET,

  // Brevo HTTP API credentials
  brevoApiKey: process.env.BREVO_API_KEY,
  brevoSenderEmail: process.env.BREVO_SENDER_EMAIL,
  brevoSenderName: process.env.BREVO_SENDER_NAME || "EduNext Platform",

  // Bcrypt — default 8 for free-tier CPU
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "8"),
};

export const config = Object.freeze(_config);
