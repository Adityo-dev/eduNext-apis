import { Router } from "express";
import { login } from "./controllers/loginController.js";
import {
  changePassword,
  forgotPassword,
  resetPassword,
} from "./controllers/passwordController.js";
import {
  getProfile,
  requestBadge,
  updateProfile,
} from "./controllers/profileController.js";
import {
  resendOtp,
  signup,
  verifyOtp,
} from "./controllers/registerController.js";
// import { authMiddleware } from "../../middlewares/authMiddleware.js";

const authRouter = Router();

authRouter.post("/signup", signup);
authRouter.post("/verify-otp", verifyOtp);
authRouter.post("/resend-otp", resendOtp);

authRouter.post("/login", login);

authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPassword);

authRouter.get("/profile", getProfile);
authRouter.patch("/profile-update", updateProfile);
authRouter.post("/request-badge", requestBadge);
authRouter.patch("/change-password", changePassword);

export default authRouter;
