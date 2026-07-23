import { Document, Types } from "mongoose";

export interface ICategory {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  parentId?: Types.ObjectId | null;
}

export interface ICategoryDocument extends ICategory, Document {
  createdAt: Date;
  updatedAt: Date;
}
