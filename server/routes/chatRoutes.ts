import express from "express";
import ChatMessage from "../models/ChatMessage.js";
import Order from "../models/Order.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const ChatMessageModel = ChatMessage as any;
const OrderModel = Order as any;

const canAccessOrderChat = (order: any, user: any) => {
  const userId = String(user._id || user.id);
  const role = String(user.role || "").toUpperCase();

  const customerId = String(order.customer?._id || order.customer || "");
  const riderId = String(order.rider?._id || order.rider || "");

  if (role === "ADMIN" || role === "SUPPORT") return true;
  if (customerId === userId) return true;
  if (riderId && riderId === userId) return true;

  if (role === "RESTAURANT") return true;

  return false;
};

router.get("/order/:orderId", protect, async (req: any, res: any) => {
  try {
    const order = await OrderModel.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!canAccessOrderChat(order, req.user)) {
      return res.status(403).json({ message: "Not allowed to view this chat" });
    }

    const messages = await ChatMessageModel.find({
      order: req.params.orderId,
      hiddenFor: { $ne: req.user._id },
    })
      .sort({ createdAt: 1 })
      .populate("sender", "name email role avatar");

    res.json({
      success: true,
      orderId: req.params.orderId,
      messages,
    });
  } catch (error: any) {
    console.error("Get chat messages error:", error);
    res.status(500).json({
      message: error.message || "Failed to load chat messages",
    });
  }
});

router.post("/order/:orderId", protect, async (req: any, res: any) => {
  try {
    const { message, messageType, imageUrl } = req.body;

    const order = await OrderModel.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!canAccessOrderChat(order, req.user)) {
      return res.status(403).json({ message: "Not allowed to message this chat" });
    }

    if (!message && !imageUrl) {
      return res.status(400).json({ message: "Message is required" });
    }

    const role = String(req.user.role || "CUSTOMER").toUpperCase();

    const chatMessage = await ChatMessageModel.create({
      order: req.params.orderId,
      sender: req.user._id,
      senderName: req.user.name || "FoodPal User",
      senderRole: role,
      message: message || "",
      messageType: messageType || (imageUrl ? "IMAGE" : "TEXT"),
      imageUrl: imageUrl || "",
      readBy: [
        {
          user: req.user._id,
          readAt: new Date(),
        },
      ],
    });

    const populatedMessage = await ChatMessageModel.findById(chatMessage._id)
      .populate("sender", "name email role avatar");

    const io = req.app.get("io");

    if (io) {
      io.to(`chat_${req.params.orderId}`).emit("chat:new_message", populatedMessage);
      io.to(`order_${req.params.orderId}`).emit("chat:new_message", populatedMessage);
    }

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error: any) {
    console.error("Send chat message error:", error);
    res.status(500).json({
      message: error.message || "Failed to send chat message",
    });
  }
});

router.patch("/order/:orderId/read", protect, async (req: any, res: any) => {
  try {
    const order = await OrderModel.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!canAccessOrderChat(order, req.user)) {
      return res.status(403).json({ message: "Not allowed to update this chat" });
    }

    await ChatMessageModel.updateMany(
      {
        order: req.params.orderId,
        "readBy.user": { $ne: req.user._id },
      },
      {
        $push: {
          readBy: {
            user: req.user._id,
            readAt: new Date(),
          },
        },
        $set: {
          isRead: true,
        },
      }
    );

    res.json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error: any) {
    console.error("Mark chat read error:", error);
    res.status(500).json({
      message: error.message || "Failed to mark messages as read",
    });
  }
});

router.post("/order/:orderId/call-request", protect, async (req: any, res: any) => {
  try {
    const { callType } = req.body;

    const order = await OrderModel.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!canAccessOrderChat(order, req.user)) {
      return res.status(403).json({ message: "Not allowed to call in this chat" });
    }

    const role = String(req.user.role || "CUSTOMER").toUpperCase();

    const callMessage = await ChatMessageModel.create({
      order: req.params.orderId,
      sender: req.user._id,
      senderName: req.user.name || "FoodPal User",
      senderRole: role,
      message: `${req.user.name || "User"} requested a ${callType || "phone"} call.`,
      messageType: "CALL_REQUEST",
      readBy: [
        {
          user: req.user._id,
          readAt: new Date(),
        },
      ],
    });

    const populatedMessage = await ChatMessageModel.findById(callMessage._id)
      .populate("sender", "name email role avatar");

    const io = req.app.get("io");

    if (io) {
      io.to(`chat_${req.params.orderId}`).emit("chat:call_request", {
        orderId: req.params.orderId,
        fromUserId: req.user._id,
        fromName: req.user.name,
        fromRole: role,
        callType: callType || "phone",
        createdAt: new Date(),
      });

      io.to(`chat_${req.params.orderId}`).emit("chat:new_message", populatedMessage);
    }

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error: any) {
    console.error("Call request error:", error);
    res.status(500).json({
      message: error.message || "Failed to send call request",
    });
  }
});

export default router;