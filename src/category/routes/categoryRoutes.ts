import { Router } from "express";
import { createCategory } from "../controllers/admin/createCategory.controller.js";
import { deleteCategory } from "../controllers/admin/deleteCategory.controller.js";
import { updateCategory } from "../controllers/admin/updateCategory.controller.js";
import { getAllCategories } from "../controllers/public/getAllCategories.controller.js";
import { getCategoryById } from "../controllers/public/getCategoryById.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);

// Admin only routes
router.post("/", authenticate, authorize(["admin"]), createCategory);
router.patch("/:id", authenticate, authorize(["admin"]), updateCategory);
router.delete("/:id", authenticate, authorize(["admin"]), deleteCategory);

export default router;
