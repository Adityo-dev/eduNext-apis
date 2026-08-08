import cors from "cors";
import express from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import adminRouter from "./admin/adminRoutes.js";
import authRouter from "./auth/routes/authRoutes.js";
import courseRouter from "./course/routes/courseRoutes.js";
import enrollmentRouter from "./enrollment/enrollmentRoutes.js";
import liveSessionRouter from "./liveSession/routes/liveSessionRoutes.js";
import globalErrorHandler from "./middlewares/GlobalErrorHandler.js";
import platformConfigRouter from "./platformConfig/routes/platformConfigRoutes.js";
import ReviewRouter from "./review/routes/reviewRoutes.js";
import uploadRouter from "./upload/uploadRoutes.js";
import wishlistRouter from "./wishlist/routes/wishlistRoutes.js";
import { commissionRoutes } from "./commissionRate/routes/commissionRate.routes.js";
import { paymentRoutes } from "./payment/routes/payment.routes.js";
import { withdrawalRoutes } from "./payment/routes/withdrawal.routes.js";
import progressRouter from "./progress/routes/progressRoutes.js";
import analyticsRouter from "./analytics/routes/analyticsRoutes.js";
import playerRouter from "./player/routes/playerRoutes.js";
import categoryRouter from "./category/routes/categoryRoutes.js";
import ticketRouter from "./ticket/routes/ticketRoutes.js";
import notificationRouter from "./notification/routes/notificationRoutes.js";
const app = express();

// Load Swagger YAML file
const swaggerDocument = YAML.load(path.join(process.cwd(), "swagger.yaml"));

//  middleware ->
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // SSLCommerz callback data (form-encoded)

app.use(cors({ origin: true, credentials: true }));

// Swagger API Docs UI Route ->
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Base Route ->
app.get("/", (req, res, next) => {
  res.json({
    message:
      "Welcome to EduNext API v1.0.0 - Developed by Aditto Dev Barmon (Koushik)",
    docs: "Visit /api-docs for API Documentation",
  });
});

// Auth routes ->
app.use("/api/v1/auth", authRouter);

// Admin routes ->
app.use("/api/v1/admin", adminRouter);

// Course routes ->
app.use("/api/v1/courses", courseRouter);

// Analytics routes ->
app.use("/api/v1/analytics", analyticsRouter);

// Player routes ->
app.use("/api/v1/player", playerRouter);

// Enrollment routes ->
app.use("/api/v1/enrollments", enrollmentRouter);

// Progress routes ->
app.use("/api/v1/progress", progressRouter);

// Live Session routes ->
app.use("/api/v1/live-sessions", liveSessionRouter);

// review router
app.use("/api/v1/reviews", ReviewRouter);

// Upload routes ->
app.use("/api/v1/upload", uploadRouter);

// Platform Config routes ->
app.use("/api/v1/platform-config", platformConfigRouter);

// Wishlist routes ->
app.use("/api/v1/wishlists", wishlistRouter);

// Commission routes ->
app.use("/api/v1", commissionRoutes);

// Payment routes ->
app.use("/api/v1/payment", paymentRoutes);

// Withdrawal routes ->
app.use("/api/v1/withdrawal", withdrawalRoutes);

// Category routes ->
app.use("/api/v1/categories", categoryRouter);

// Support Ticket routes ->
app.use("/api/v1/tickets", ticketRouter);

// Notification routes ->
app.use("/api/v1/notifications", notificationRouter);

// Global Error Handler ->
app.use(globalErrorHandler);

export default app;
