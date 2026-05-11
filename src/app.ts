import express from "express";
import globalErrorHandler from "./middlewares/GlobalErrorHandler.js";
import userRouter from "./user/userRouter.js";

const app = express();

// JSON Body Middleware ->
app.use(express.json());

// Routes ->
app.get("/", (req, res, next) => {
  res.json({
    message: "Welcome to EduNext API",
  });
});

// user routes ->
app.use("/api/users", userRouter);

// Global Error Handler ->
app.use(globalErrorHandler);

export default app;
