import express from "express";
import createHttpError from "http-errors";
import globalErrorHandler from "./middlewares/GlobalErrorHandler.js";

const app = express();

// Routes ->
app.get("/", (req, res, next) => {
  const error = createHttpError(400, "Something went wrong");
  throw error;
  res.json({ message: "Welcome to Edu Next API " });
});

// Global Error Handler ->
app.use(globalErrorHandler);

export default app;
