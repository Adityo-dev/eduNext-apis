import { config as conf } from "dotenv";
conf();

const _config = {
  port: process.env.PORT,
  databaseUrl: process.env.MONGO_CONNECTION_STRING,
  env: process.env.NODE_ENV,
  jwtSecret: process.env.JWT_SECRET,

  // Nodemailer Configuration
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,

  // Bcrypt — default 8 for free-tier CPU, set to 10 in paid env via BCRYPT_ROUNDS
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "8"),
};

export const config = Object.freeze(_config);
