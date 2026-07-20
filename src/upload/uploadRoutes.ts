import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.js";
import { uploadImage } from "./uploadController.js";

const uploadRouter = Router();

uploadRouter.use(authenticate);
uploadRouter.post("/image", upload.single("image"), uploadImage);

export default uploadRouter;
