import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    icon: {
      type: String,
      default: "",
    },

    bannerImage: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    order: {
      type: Number,
      default: 0,
    },

    color: {
      type: String,
      default: "#f97316",
    },

    tags: [{ type: String }],
  },
  { timestamps: true }
);

CategorySchema.index({ restaurant: 1, order: 1 });
CategorySchema.index({ name: "text", description: "text" });

export default mongoose.models.Category ||
  mongoose.model("Category", CategorySchema);