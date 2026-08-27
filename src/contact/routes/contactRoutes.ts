import { Router } from "express";
import { submitContactMessage } from "../controllers/public/submitContactMessage.controller.js";

const contactRouter = Router();

// ─── Public Routes
contactRouter.post("/", submitContactMessage);

export default contactRouter;
