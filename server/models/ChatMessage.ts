import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    senderName: {
      type: String,
      required: true,
      trim: true,
    },

    senderRole: {
      type: String,
      enum: ["CUSTOMER", "RESTAURANT", "RIDER", "ADMIN", "SUPPORT"],
      required: true,
      index: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    messageType: {
      type: String,
      enum: ["TEXT", "SYSTEM", "CALL_REQUEST", "IMAGE"],
      default: "TEXT",
    },

    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    hiddenFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

chatMessageSchema.index({ order: 1, createdAt: 1 });
chatMessageSchema.index({ sender: 1, createdAt: -1 });

export default mongoose.models.ChatMessage ||
  mongoose.model("ChatMessage", chatMessageSchema);