import mongoose from "mongoose";

const addonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, default: 0 },
});

const variantSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Small, Medium, Large
  price: { type: Number, required: true },
});

const menuItemSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
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

    price: {
      type: Number,
      required: true,
    },

    originalPrice: {
      type: Number,
      default: 0,
    },

    variants: [variantSchema],

    addons: [addonSchema],

    isAvailable: {
      type: Boolean,
      default: true,
    },

    isVegetarian: {
      type: Boolean,
      default: false,
    },

    isVegan: {
      type: Boolean,
      default: false,
    },

    isHalal: {
      type: Boolean,
      default: false,
    },

    spicyLevel: {
      type: Number,
      default: 0,
    },

    calories: {
      type: Number,
      default: 0,
    },

    preparationTime: {
      type: Number,
      default: 15,
    },

    stockQuantity: {
      type: Number,
      default: 100,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isBestSeller: {
      type: Boolean,
      default: false,
    },

    tags: [{ type: String }],

    rating: {
      type: Number,
      default: 0,
    },

    numReviews: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

menuItemSchema.index({ name: "text", description: "text", tags: "text" });

const MenuItem =
  mongoose.models.MenuItem ||
  mongoose.model("MenuItem", menuItemSchema);

export default MenuItem;