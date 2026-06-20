import app from "./src/app.js";
import { config } from "./src/config/config.js";
import connectDB from "./src/config/db.js";
import { verifySMTPConnection } from "./src/utils/sendEmail.js";

const startServer = async () => {
  await connectDB();
  await verifySMTPConnection();

  const port = config.port || 3000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

startServer();
