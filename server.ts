import app from "./src/app.js";
import { config } from "./src/config/config.js";
import connectDB from "./src/config/db.js";
import { verifySMTPConnection } from "./src/utils/sendEmail.js";

const startServer = async () => {
  await verifySMTPConnection();

  const port = config.port || 3000;
  const runServer = async () => {
    await connectDB();
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  };
  runServer();
};

startServer();
