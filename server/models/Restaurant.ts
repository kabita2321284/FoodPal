import mongoose from "mongoose";

const dayOpeningHoursSchema = new mongoose.Schema(
  {
    isOpen: {
      type: Boolean,
      default: true,
    },

    open: {
      type: String,
      default: "09:00",
      trim: true,
    },

    close: {
      type: String,
      default: "22:00",
      trim: true,
    },
  },
  { _id: false }
);

const RestaurantSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
      trim: true,
    },

    address: {
      text: {
        type: String,
        required: true,
        trim: true,
      },

      city: {
        type: String,
        default: "",
        trim: true,
      },

      lat: {
        type: Number,
        default: null,
      },

      lng: {
        type: Number,
        default: null,
      },

      placeId: {
        type: String,
        default: "",
        trim: true,
      },
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },

    cuisine: [
      {
        type: String,
        trim: true,
      },
    ],

    images: [
      {
        type: String,
      },
    ],

    logo: {
      type: String,
      default: "",
    },

    bannerImage: {
      type: String,
      default: "",
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    numReviews: {
      type: Number,
      default: 0,
      min: 0,
    },

    isOpen: {
      type: Boolean,
      default: true,
    },

    openingHours: {
      open: {
        type: String,
        default: "09:00",
        trim: true,
      },

      close: {
        type: String,
        default: "22:00",
        trim: true,
      },
    },

    weeklyOpeningHours: {
      monday: {
        type: dayOpeningHoursSchema,
        default: () => ({ isOpen: true, open: "09:00", close: "22:00" }),
      },

      tuesday: {
        type: dayOpeningHoursSchema,
        default: () => ({ isOpen: true, open: "09:00", close: "22:00" }),
      },

      wednesday: {
        type: dayOpeningHoursSchema,
        default: () => ({ isOpen: true, open: "09:00", close: "22:00" }),
      },

      thursday: {
        type: dayOpeningHoursSchema,
        default: () => ({ isOpen: true, open: "09:00", close: "22:00" }),
      },

      friday: {
        type: dayOpeningHoursSchema,
        default: () => ({ isOpen: true, open: "09:00", close: "22:00" }),
      },

      saturday: {
        type: dayOpeningHoursSchema,
        default: () => ({ isOpen: true, open: "09:00", close: "22:00" }),
      },

      sunday: {
        type: dayOpeningHoursSchema,
        default: () => ({ isOpen: true, open: "10:00", close: "22:00" }),
      },
    },

    deliveryFee: {
      type: Number,
      default: 50,
      min: 0,
    },

    minimumOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    estimatedDeliveryTime: {
      type: Number,
      default: 30,
      min: 1,
    },

    preparationTime: {
      type: Number,
      default: 20,
      min: 1,
    },

    averagePrepTime: {
      type: Number,
      default: 20,
      min: 1,
    },

    busyPrepTimeExtra: {
      type: Number,
      default: 10,
      min: 0,
    },

    isBusy: {
      type: Boolean,
      default: false,
    },

    priceLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },

    serviceRadiusKm: {
      type: Number,
      default: 5,
      min: 0,
    },

    deliverySpeedKmph: {
      type: Number,
      default: 22,
      min: 1,
    },

    pickupBufferMinutes: {
      type: Number,
      default: 5,
      min: 0,
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isPromoted: {
      type: Boolean,
      default: false,
    },

    commissionRate: {
      type: Number,
      default: 15,
      min: 0,
      max: 100,
    },

    status: {
      type: String,
      enum: ["pending_review", "approved", "rejected", "suspended"],
      default: "pending_review",
    },

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

/**
 * Auto-create GeoJSON location from saved address lat/lng.
 * IMPORTANT:
 * Do not use next() here. Newer Mongoose versions can throw:
 * "next is not a function"
 */
RestaurantSchema.pre("save", function () {
  const restaurant: any = this;

  const lat = Number(restaurant.address?.lat);
  const lng = Number(restaurant.address?.lng);

  if (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  ) {
    restaurant.location = {
      type: "Point",
      coordinates: [lng, lat],
    };
  }
});

RestaurantSchema.index({ owner: 1 });
RestaurantSchema.index({ location: "2dsphere" });
RestaurantSchema.index({ name: "text", cuisine: "text", tags: "text" });
RestaurantSchema.index({ status: 1, isOpen: 1, isFeatured: 1 });
RestaurantSchema.index({ owner: 1, createdAt: -1 });
RestaurantSchema.index({ isBusy: 1, isOpen: 1 });

const RestaurantModel =
  mongoose.models.Restaurant || mongoose.model("Restaurant", RestaurantSchema);

export default RestaurantModel;