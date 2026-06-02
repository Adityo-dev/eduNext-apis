import express from "express";
import authRouter from "./auth/authRoutes.js";
import globalErrorHandler from "./middlewares/GlobalErrorHandler.js";
const app = express();

// Json parser middleware ->
app.use(express.json());

// Routes ->
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to EduNext API v1.0.0 - Developed by Aditto Dev",
  });
});

// Auth routes ->
app.use("/api/v1/auth", authRouter);

// Global Error Handler ->
app.use(globalErrorHandler);

export default app;
