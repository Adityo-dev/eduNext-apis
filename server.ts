import app from "./src/app.js";
import { config } from "./src/config/config.js";

const startServer = () => {
  const port = config.port || 3000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

startServer();
