import mongoose from "mongoose";

const FavoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
  },
  { timestamps: true }
);

FavoriteSchema.index({ user: 1, restaurant: 1 }, { unique: true });

export default mongoose.models.Favorite ||
  mongoose.model("Favorite", FavoriteSchema);