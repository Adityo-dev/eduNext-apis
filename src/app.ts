import express from "express";
import createHttpError from "http-errors";
import globalErrorHandler from "./middlewares/GlobalErrorHandler.js";
import userRouter from "./user/userRouter.js";

const app = express();

// JSON Body Middleware ->
app.use(express.json());

// Routes ->
app.get("/", (req, res, next) => {
  const error = createHttpError(400, "Something went wrong");
  throw error;
});

// user routes ->
app.use("/api/users", userRouter);

// Global Error Handler ->
app.use(globalErrorHandler);

export default app;
