import { Router } from "express";
import { login, resendOtp, signup, verifyOtp } from "./authController.js";

const authRouter = Router();

// Public Auth API routes ->
authRouter.post("/signup", signup);
authRouter.post("/login", login);
authRouter.post("/verify-otp", verifyOtp);
authRouter.post("/resend-otp", resendOtp);

export default authRouter;
