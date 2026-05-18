import dotenv from "dotenv";
dotenv.config();

import favoriteRoutes from "./server/routes/favoriteRoutes.js";
import reviewRoutes from "./server/routes/reviewRoutes.js";
import promoRoutes from "./server/routes/promoRoutes.js";
import chatRoutes from "./server/routes/chatRoutes.js";

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import cors from "cors";

import connectDB from "./server/config/db.js";
import authRoutes from "./server/routes/authRoutes.js";
import userRoutes from "./server/routes/userRoutes.js";
import restaurantRoutes from "./server/routes/restaurantRoutes.js";
import orderRoutes from "./server/routes/orderRoutes.js";
import seedRoutes from "./server/routes/seedRoutes.js";
import uploadRoutes from "./server/routes/uploadRoutes.js";
import adminRoutes from "./server/routes/adminRoutes.js";
import riderRoutes from "./server/routes/riderRoutes.js";
import { seedAdmin } from "./server/utils/seedAdmin.js";

connectDB().then(() => {
  seedAdmin();
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

const socketCorsOrigin =
  process.env.NODE_ENV === "production" ? allowedOrigins : "*";

const buildRoom = (prefix: string, id: string) => `${prefix}_${id}`;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: socketCorsOrigin,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  const PORT = Number(process.env.PORT) || 3000;

  app.set("io", io);

  app.use(
    cors({
      origin: process.env.NODE_ENV === "production" ? allowedOrigins : "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    })
  );

  app.use(
    "/api/payments/stripe/webhook",
    express.raw({ type: "application/json" })
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      message: "FoodPal Server is running",
      socket: "enabled",
      payment: "enabled",
      chat: "enabled",
      time: new Date().toISOString(),
    });
  });

  app.use("/api/favorites", favoriteRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/promos", promoRoutes);
  app.use("/api/chats", chatRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/restaurants", restaurantRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/seed", seedRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/riders", riderRoutes);

  app.use("/api", (req, res) => {
    console.log(`API 404: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
      success: false,
      message: `API route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("Internal Server Error:", err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
      code: err.code,
    });
  });

  io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.id);

    socket.on("user:join", (userId) => {
      if (!userId) return;
      socket.join(buildRoom("user", String(userId)));
      console.log(`Socket ${socket.id} joined user_${userId}`);
    });

    socket.on("admin:join", () => {
      socket.join("admin_room");
      console.log(`Socket ${socket.id} joined admin_room`);
    });

    socket.on("restaurant:join", (restaurantId) => {
      if (!restaurantId) return;
      socket.join(buildRoom("restaurant", String(restaurantId)));
      console.log(`Socket ${socket.id} joined restaurant_${restaurantId}`);
    });

    socket.on("rider:join", (riderId) => {
      if (!riderId) return;
      socket.join(buildRoom("rider", String(riderId)));
      socket.join(buildRoom("user", String(riderId)));
      console.log(`Socket ${socket.id} joined rider_${riderId}`);
    });

    socket.on("order:join", (orderId) => {
      if (!orderId) return;
      socket.join(buildRoom("order", String(orderId)));
      socket.join(buildRoom("chat", String(orderId)));
      console.log(`Socket ${socket.id} joined order_${orderId}`);
      console.log(`Socket ${socket.id} joined chat_${orderId}`);
    });

    socket.on("order:leave", (orderId) => {
      if (!orderId) return;
      socket.leave(buildRoom("order", String(orderId)));
      socket.leave(buildRoom("chat", String(orderId)));
      console.log(`Socket ${socket.id} left order_${orderId}`);
      console.log(`Socket ${socket.id} left chat_${orderId}`);
    });

    socket.on("chat:join", (orderId) => {
      if (!orderId) return;
      socket.join(buildRoom("chat", String(orderId)));
      console.log(`Socket ${socket.id} joined chat_${orderId}`);
    });

    socket.on("chat:leave", (orderId) => {
      if (!orderId) return;
      socket.leave(buildRoom("chat", String(orderId)));
      console.log(`Socket ${socket.id} left chat_${orderId}`);
    });

    socket.on("chat:typing", (data) => {
      const { orderId, userId, name, role, isTyping } = data || {};
      if (!orderId) return;

      socket.to(buildRoom("chat", String(orderId))).emit("chat:typing", {
        orderId,
        userId,
        name,
        role,
        isTyping: Boolean(isTyping),
        updatedAt: new Date(),
      });
    });

    socket.on("chat:message_sent", (message) => {
      const orderId = message?.order || message?.orderId;
      if (!orderId) return;

      io.to(buildRoom("chat", String(orderId))).emit("chat:new_message", {
        ...message,
        orderId,
        createdAt: message?.createdAt || new Date(),
      });
    });

    socket.on("chat:call_request", (data) => {
      const { orderId, fromUserId, fromName, fromRole, callType } = data || {};
      if (!orderId) return;

      io.to(buildRoom("chat", String(orderId))).emit("chat:call_request", {
        orderId,
        fromUserId,
        fromName,
        fromRole,
        callType: callType || "phone",
        createdAt: new Date(),
      });
    });

    socket.on("payment:completed", (data) => {
      const { orderId, userId, restaurantId, paymentMethod } = data || {};

      const payload = {
        ...data,
        paymentStatus: "paid",
        updatedAt: new Date(),
      };

      if (orderId) {
        io.to(buildRoom("order", String(orderId))).emit(
          "payment:completed",
          payload
        );
        io.to(buildRoom("order", String(orderId))).emit("order:updated", payload);
      }

      io.to("admin_room").emit("payment:completed", payload);
      io.to("admin_room").emit("order:updated", payload);

      if (userId) {
        io.to(buildRoom("user", String(userId))).emit("notification", {
          title: "Payment Successful",
          message: `Your ${paymentMethod || "payment"} payment was successful.`,
          orderId,
          createdAt: new Date(),
        });
      }

      if (restaurantId) {
        io.to(buildRoom("restaurant", String(restaurantId))).emit(
          "order:updated",
          payload
        );
      }
    });

    socket.on("rider:availability_update", (data) => {
      const { riderId, userId, isAvailable, isBusy, currentLocation } =
        data || {};

      const payload = {
        riderId,
        userId,
        isAvailable: Boolean(isAvailable),
        isBusy: Boolean(isBusy),
        currentLocation,
        updatedAt: new Date(),
      };

      io.to("admin_room").emit("rider:availability_update", payload);

      if (userId) {
        io.to(buildRoom("user", String(userId))).emit(
          "rider:availability_update",
          payload
        );
      }
    });

    socket.on("rider:location_update", (data) => {
      const {
        orderId,
        riderId,
        lat,
        lng,
        accuracy,
        heading,
        speed,
        updatedAt,
      } = data || {};

      if (!orderId || lat === undefined || lng === undefined) return;

      const payload = {
        orderId,
        riderId,
        lat: Number(lat),
        lng: Number(lng),
        accuracy: accuracy ?? null,
        heading: heading ?? null,
        speed: speed ?? null,
        updatedAt: updatedAt || new Date(),
      };

      io.to(buildRoom("order", String(orderId))).emit(
        "rider:location_update",
        payload
      );

      io.to("admin_room").emit("rider:location_update", payload);

      if (riderId) {
        io.to(buildRoom("rider", String(riderId))).emit(
          "rider:location_update",
          payload
        );
      }

      console.log(
        `📍 Rider location updated for order_${orderId}:`,
        payload.lat,
        payload.lng
      );
    });

    socket.on("order:update_status", (data) => {
      const { orderId, status, userId, customerId, restaurantId, riderId } =
        data || {};

      if (!orderId || !status) return;

      const payload = {
        ...data,
        updatedAt: new Date(),
      };

      io.to(buildRoom("order", String(orderId))).emit(
        "order:status_update",
        payload
      );

      io.to(buildRoom("order", String(orderId))).emit("order:updated", payload);
      io.to("admin_room").emit("order:updated", payload);

      const finalUserId = userId || customerId;

      if (finalUserId) {
        io.to(buildRoom("user", String(finalUserId))).emit("notification", {
          title: "Order Update",
          message: `Your order is now ${String(status).replaceAll("_", " ")}`,
          orderId,
          createdAt: new Date(),
        });
      }

      if (restaurantId) {
        io.to(buildRoom("restaurant", String(restaurantId))).emit(
          "order:updated",
          payload
        );
      }

      if (riderId) {
        io.to(buildRoom("rider", String(riderId))).emit("order:updated", payload);
        io.to(buildRoom("user", String(riderId))).emit("order:updated", payload);
      }

      console.log(`🔄 Order ${orderId} updated to ${status}`);
    });

    socket.on("order:assigned", (data) => {
      const { orderId, riderId, customerId, restaurantId } = data || {};

      if (!orderId) return;

      const payload = {
        ...data,
        updatedAt: new Date(),
      };

      io.to(buildRoom("order", String(orderId))).emit("order:assigned", payload);
      io.to(buildRoom("order", String(orderId))).emit("order:updated", payload);
      io.to(buildRoom("chat", String(orderId))).emit("chat:participant_added", {
        orderId,
        riderId,
        role: "RIDER",
        message: "Rider joined this order chat.",
        createdAt: new Date(),
      });

      io.to("admin_room").emit("order:updated", payload);

      if (customerId) {
        io.to(buildRoom("user", String(customerId))).emit("notification", {
          title: "Rider Assigned",
          message: "A rider has been assigned to your order.",
          orderId,
          createdAt: new Date(),
        });
      }

      if (restaurantId) {
        io.to(buildRoom("restaurant", String(restaurantId))).emit(
          "order:updated",
          payload
        );
      }

      if (riderId) {
        io.to(buildRoom("rider", String(riderId))).emit("order:assigned", payload);
        io.to(buildRoom("user", String(riderId))).emit("notification", {
          title: "New Delivery Assigned",
          message: "A new delivery has been assigned to you.",
          orderId,
          createdAt: new Date(),
        });
      }
    });

    socket.on("notification:send", (data) => {
      const { userId, title, message, orderId } = data || {};

      if (!userId) return;

      io.to(buildRoom("user", String(userId))).emit("notification", {
        title: title || "FoodPal Notification",
        message: message || "",
        orderId,
        createdAt: new Date(),
      });
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id);
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));

    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`FoodPal running on http://localhost:${PORT}`);
    console.log("Socket.IO live tracking enabled");
    console.log("Order chat enabled");
    console.log("Payments enabled: Stripe + Khalti + eSewa");
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});