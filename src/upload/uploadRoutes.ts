import { Router } from "express";
import { upload } from "../middlewares/upload.js";
import { uploadImage } from "./uploadController.js";
// import { authenticate } from "../middlewares/auth.middleware.js";

const uploadRouter = Router();

// uploadRouter.use(authenticate); // optional authentication guard
uploadRouter.post("/image", upload.single("image"), uploadImage);

export default uploadRouter;
