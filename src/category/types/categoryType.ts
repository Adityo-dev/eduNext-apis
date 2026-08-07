import { Document, Types } from "mongoose";

export interface ICategory {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  isActive: boolean;
  parentId?: Types.ObjectId | null;
  order?: number;
}

export interface ICategoryDocument extends ICategory, Document {
  createdAt: Date;
  updatedAt: Date;
}
