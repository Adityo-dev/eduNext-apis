import { config as conf } from "dotenv";
conf();

const _config = {
  port: process.env.PORT,
  databaseUrl: process.env.MONGO_CONNECTION_STRING,
  env: process.env.NODE_ENV,
  jwtSecret: process.env.JWT_SECRET,

  // Clean SMTP Credentials
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,

  // Bcrypt — default 8 for free-tier CPU
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "8"),
};

export const config = Object.freeze(_config);
