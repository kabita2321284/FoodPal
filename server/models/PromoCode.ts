import mongoose from "mongoose";

const PromoCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },

    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FIXED"],
      required: true,
    },

    discountValue: { type: Number, required: true },
    maxDiscount: { type: Number, default: 0 },
    minOrderAmount: { type: Number, default: 0 },

    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      default: null,
    },

    usageLimit: { type: Number, default: 0 },
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },

    startsAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PromoCodeSchema.index({ code: 1 });
PromoCodeSchema.index({ restaurant: 1 });

export default mongoose.models.PromoCode ||
  mongoose.model("PromoCode", PromoCodeSchema);