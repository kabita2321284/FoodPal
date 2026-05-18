import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    selectedVariant: {
      name: {
        type: String,
        default: "",
      },
      price: {
        type: Number,
        default: 0,
      },
    },

    selectedAddons: [
      {
        name: {
          type: String,
          default: "",
        },
        price: {
          type: Number,
          default: 0,
        },
      },
    ],

    specialInstructions: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const trackingEventSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      default: "",
      trim: true,
    },

    time: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const paymentHistorySchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["CASH", "CARD", "STRIPE", "ESEWA", "KHALTI", "WALLET"],
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "INITIATED", "PAID", "FAILED", "CANCELLED", "REFUNDED"],
      default: "PENDING",
    },

    providerTransactionId: {
      type: String,
      default: "",
      trim: true,
    },

    providerReference: {
      type: String,
      default: "",
      trim: true,
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      default: "GBP",
      trim: true,
      uppercase: true,
    },

    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    riderProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
      default: null,
      index: true,
    },

    autoAssignmentStatus: {
      type: String,
      enum: ["NOT_STARTED", "SEARCHING", "ASSIGNED", "NO_RIDER_FOUND", "FAILED"],
      default: "NOT_STARTED",
      index: true,
    },

    autoAssignmentAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    assignedAt: {
      type: Date,
      default: null,
    },

    assignmentExpiresAt: {
      type: Date,
      default: null,
    },

    rejectedRiders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Rider",
      },
    ],

    items: [orderItemSchema],

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    platformFee: {
      type: Number,
      default: 10,
      min: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    surgeFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "GBP",
      trim: true,
      uppercase: true,
    },

    promoCode: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "ACCEPTED",
        "PREPARING",
        "READY_FOR_PICKUP",
        "PICKED_UP",
        "ON_THE_WAY",
        "DELIVERED",
        "CANCELLED",
        "REJECTED",
        "REFUNDED",
      ],
      default: "PENDING",
      index: true,
    },

    cancellationReason: {
      type: String,
      default: "",
      trim: true,
    },

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },

    deliveryAddress: {
      label: {
        type: String,
        default: "Home",
        trim: true,
      },
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
      phone: {
        type: String,
        default: "",
        trim: true,
      },
      instructions: {
        type: String,
        default: "",
        trim: true,
      },
    },

    restaurantAddress: {
      text: {
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

    paymentMethod: {
      type: String,
      enum: ["CASH", "CARD", "STRIPE", "ESEWA", "KHALTI", "WALLET"],
      default: "CASH",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "INITIATED", "PAID", "FAILED", "CANCELLED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },

    paymentReference: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    paymentProviderTransactionId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    stripeCheckoutSessionId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    stripePaymentIntentId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    esewaTransactionUuid: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    khaltiPidx: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    paymentFailureReason: {
      type: String,
      default: "",
      trim: true,
    },

    paymentHistory: [paymentHistorySchema],

    estimatedTime: {
      type: Number,
      default: 30,
      min: 1,
    },

    preparationTime: {
      type: Number,
      default: 20,
      min: 1,
    },

    deliveryDistanceKm: {
      type: Number,
      default: 0,
      min: 0,
    },

    riderDistanceToRestaurantKm: {
      type: Number,
      default: 0,
      min: 0,
    },

    trackingEvents: [trackingEventSchema],

    riderLocation: {
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

    customerNote: {
      type: String,
      default: "",
      trim: true,
    },

    restaurantNote: {
      type: String,
      default: "",
      trim: true,
    },

    isReviewed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ customer: 1, createdAt: -1 });
OrderSchema.index({ restaurant: 1, createdAt: -1 });
OrderSchema.index({ rider: 1, createdAt: -1 });
OrderSchema.index({ riderProfile: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });
OrderSchema.index({ paymentMethod: 1, createdAt: -1 });
OrderSchema.index({ autoAssignmentStatus: 1 });
OrderSchema.index({
  "deliveryAddress.lat": 1,
  "deliveryAddress.lng": 1,
});
OrderSchema.index({
  "restaurantAddress.lat": 1,
  "restaurantAddress.lng": 1,
});

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);