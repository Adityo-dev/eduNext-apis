import http from "http";
import app from "./src/app.js";
import { config } from "./src/config/config.js";
import { initAllCronJobs } from "./src/config/cron.js";
import connectDB from "./src/config/db.js";
import { initSocket } from "./src/config/socket.js";
import { verifySMTPConnection } from "./src/utils/sendEmail.js";

const startServer = async () => {
  await verifySMTPConnection();

  const port = config.port || 3000;

  const runServer = async () => {
    try {
      await connectDB();

      initAllCronJobs();

      const server = http.createServer(app);
      initSocket(server);

      server.listen(port, () => {
        console.log(`Server is running on port ${port}`);
      });
    } catch (error) {
      console.error("Failed to start the server due to database error:", error);
      process.exit(1);
    }
  };

  runServer();
};

startServer();
