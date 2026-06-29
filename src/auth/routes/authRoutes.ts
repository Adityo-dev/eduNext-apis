import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { login } from "../controllers/loginController.js";
import {
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/passwordController.js";
import {
  getProfile,
  requestBadge,
  updateProfile,
} from "../controllers/profileController.js";
import {
  resendOtp,
  signup,
  verifyOtp,
} from "../controllers/registerController.js";

const authRouter = Router();

authRouter.post("/signup", signup);
authRouter.post("/verify-otp", verifyOtp);
authRouter.post("/resend-otp", resendOtp);

authRouter.post("/login", login);

authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPassword);

authRouter.get("/profile", authenticate, getProfile);
authRouter.patch("/profile-update", authenticate, updateProfile);
authRouter.post("/request-badge", authenticate, requestBadge);
authRouter.patch("/change-password", authenticate, changePassword);

export default authRouter;
