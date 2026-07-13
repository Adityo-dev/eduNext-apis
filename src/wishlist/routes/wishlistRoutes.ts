import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  addToWishlist,
  getUserWishlist,
  removeFromWishlist,
} from "../controllers/wishlistController.js";

const wishlistRouter = Router();

wishlistRouter.use(authenticate);

wishlistRouter.post("/", addToWishlist);
wishlistRouter.get("/", getUserWishlist);
wishlistRouter.delete("/:courseId", removeFromWishlist);

export default wishlistRouter;
