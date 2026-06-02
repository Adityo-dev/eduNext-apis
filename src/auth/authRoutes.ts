import { Router } from "express";
import { login, signup } from "./authController.js";

const authRouter = Router();

// Public Auth API routes ->
authRouter.post("/signup", signup);
authRouter.post("/login", login);

export default authRouter;
