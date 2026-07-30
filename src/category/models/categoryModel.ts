import { Schema, model } from "mongoose";
import type { ICategoryDocument } from "../types/categoryType.js";

const categorySchema = new Schema<ICategoryDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    image: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  },
);

// Virtual for sub-categories
categorySchema.virtual("subCategories", {
  ref: "Category",
  localField: "_id",
  foreignField: "parentId",
});

const Category = model<ICategoryDocument>("Category", categorySchema);

export default Category;
