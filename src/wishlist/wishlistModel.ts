import { Document, Schema, Types, model } from "mongoose";

export interface IWishlist extends Document {
  user: Types.ObjectId;
  course: Types.ObjectId;
  createdAt: Date;
}

const wishlistSchema = new Schema<IWishlist>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  },
  { timestamps: true, versionKey: false },
);

wishlistSchema.index({ user: 1, course: 1 }, { unique: true });

export const WishlistModel = model<IWishlist>("Wishlist", wishlistSchema);
