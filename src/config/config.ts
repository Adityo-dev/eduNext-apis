import { config as conf } from "dotenv";
conf();

const _config = {
  port: process.env.PORT,
  databaseUrl: process.env.MONGO_CONNECTION_STRING,
  env: process.env.NODE_ENV,
  jwtSecret: process.env.JWT_SECRET,

  // Google OAuth2 Settings (Gmail API)
  oauthClientId: process.env.OAUTH_CLIENT_ID,
  oauthClientSecret: process.env.OAUTH_CLIENT_SECRET,
  oauthRefreshToken: process.env.OAUTH_REFRESH_TOKEN,
  oauthEmail: process.env.OAUTH_EMAIL,

  // Bcrypt — default 8 for free-tier CPU
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || "8"),
};

export const config = Object.freeze(_config);
