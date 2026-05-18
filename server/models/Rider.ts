import mongoose from "mongoose";

const RiderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    vehicleType: {
      type: String,
      enum: ["MOTORBIKE", "SCOOTER", "BICYCLE", "CAR"],
      required: true,
    },

    licenseNumber: {
      type: String,
      trim: true,
    },

    licenseImage: {
      type: String,
    },

    citizenshipImage: {
      type: String,
    },

    profilePhoto: {
      type: String,
    },

    status: {
      type: String,
      enum: ["pending_review", "approved", "rejected", "suspended"],
      default: "pending_review",
      index: true,
    },

    rejectionReason: {
      type: String,
      trim: true,
    },

    isAvailable: {
      type: Boolean,
      default: false,
      index: true,
    },

    isBusy: {
      type: Boolean,
      default: false,
      index: true,
    },

    currentOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },

    currentLocation: {
      lat: {
        type: Number,
        default: null,
      },
      lng: {
        type: Number,
        default: null,
      },
      accuracy: {
        type: Number,
        default: null,
      },
      heading: {
        type: Number,
        default: null,
      },
      speed: {
        type: Number,
        default: null,
      },
      updatedAt: {
        type: Date,
        default: null,
      },
    },

    lastAssignedAt: {
      type: Date,
      default: null,
    },

    totalDeliveries: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },

    rating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

RiderSchema.index({ status: 1, isAvailable: 1, isBusy: 1 });
RiderSchema.index({
  "currentLocation.lat": 1,
  "currentLocation.lng": 1,
});

export default mongoose.models.Rider || mongoose.model("Rider", RiderSchema);