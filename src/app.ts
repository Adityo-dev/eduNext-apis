import cors from "cors";
import express from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import adminRouter from "./admin/adminRoutes.js";
import authRouter from "./auth/authRoutes.js";
import courseRouter from "./course/courseRoutes.js";
import globalErrorHandler from "./middlewares/GlobalErrorHandler.js";

const app = express();

// Load Swagger YAML file
const swaggerDocument = YAML.load(path.join(process.cwd(), "swagger.yaml"));

//  middleware ->
app.use(express.json());
app.use(cors({ origin: "http://localhost:3005/", credentials: true }));

// Swagger API Docs UI Route ->
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Base Route ->
app.get("/", (req, res, next) => {
  res.json({
    message: "Welcome to EduNext API v1.0.0 - Developed by Aditto Dev",
    docs: "Visit /api-docs for API Documentation",
  });
});

// Auth routes ->
app.use("/api/v1/auth", authRouter);

// Admin routes ->
app.use("/api/v1/admin", adminRouter);

// Course routes ->
app.use("/api/v1/courses", courseRouter);

// Global Error Handler ->
app.use(globalErrorHandler);

export default app;
