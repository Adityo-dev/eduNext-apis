import { Router } from "express";
import { createCategory } from "../controllers/admin/createCategory.controller.js";
import { deleteCategory } from "../controllers/admin/deleteCategory.controller.js";
import { updateCategory } from "../controllers/admin/updateCategory.controller.js";
import { reorderCategories } from "../controllers/admin/reorderCategories.controller.js";
import { getAllCategories } from "../controllers/public/getAllCategories.controller.js";
import { getCategoryById } from "../controllers/public/getCategoryById.controller.js";
import { getSubcategoriesByCategoryId } from "../controllers/public/getSubcategoriesByCategoryId.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);
router.get("/:id/subcategories", getSubcategoriesByCategoryId);

// Admin only routes
router.post("/", authenticate, authorize(["admin"]), createCategory);
router.put("/reorder", authenticate, authorize(["admin"]), reorderCategories);
router.patch("/:id", authenticate, authorize(["admin"]), updateCategory);
router.delete("/:id", authenticate, authorize(["admin"]), deleteCategory);

export default router;
