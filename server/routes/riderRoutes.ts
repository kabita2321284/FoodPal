import express from "express";
import { protect } from "../middleware/authMiddleware";
import Rider from "../models/Rider";
import User from "../models/User";
import Order from "../models/Order";

const router = express.Router();

const RiderModel = Rider as any;
const UserModel = User as any;
const OrderModel = Order as any;

const hasValidCoords = (lat: any, lng: any) => {
  const nLat = Number(lat);
  const nLng = Number(lng);

  return (
    Number.isFinite(nLat) &&
    Number.isFinite(nLng) &&
    nLat >= -90 &&
    nLat <= 90 &&
    nLng >= -180 &&
    nLng <= 180 &&
    !(nLat === 0 && nLng === 0)
  );
};

const addTrackingEvent = (status: string, message: string) => ({
  status,
  message,
  time: new Date(),
});

const populateOrder = (id: string) => {
  return OrderModel.findById(id)
    .populate("restaurant")
    .populate("customer", "name phone email")
    .populate("rider", "name phone email")
    .populate({
      path: "riderProfile",
      populate: {
        path: "userId",
        select: "name email phone",
      },
    });
};

const emitOrderUpdate = (req: any, order: any) => {
  const io = req.app.get("io");
  if (!io || !order) return;

  const orderId = String(order._id);
  const customerId = String(order.customer?._id || order.customer || "");
  const restaurantId = String(order.restaurant?._id || order.restaurant || "");
  const riderId = String(order.rider?._id || order.rider || "");

  io.to(`order_${orderId}`).emit("order:status_update", order);
  io.to(`order_${orderId}`).emit("order:updated", order);
  io.to("admin_room").emit("order:updated", order);

  if (customerId) {
    io.to(`user_${customerId}`).emit("order:updated", order);
    io.to(`user_${customerId}`).emit("notification", {
      title: "Order Update",
      message: `Your order is now ${String(order.status).replaceAll("_", " ")}`,
      orderId,
      createdAt: new Date(),
    });
  }

  if (restaurantId) {
    io.to(`restaurant_${restaurantId}`).emit("order:updated", order);
  }

  if (riderId) {
    io.to(`user_${riderId}`).emit("order:updated", order);
    io.to(`rider_${riderId}`).emit("order:updated", order);
  }
};

router.post("/register", protect, async (req: any, res: any) => {
  try {
    const {
      vehicleType,
      licenseNumber,
      licenseImage,
      citizenshipImage,
      profilePhoto,
    } = req.body;

    if (!vehicleType) {
      return res.status(400).json({ message: "Vehicle type is required" });
    }

    const existingRider = await RiderModel.findOne({ userId: req.user._id });

    if (existingRider) {
      return res.status(400).json({ message: "Rider profile already exists" });
    }

    const rider = await RiderModel.create({
      userId: req.user._id,
      vehicleType,
      licenseNumber,
      licenseImage,
      citizenshipImage,
      profilePhoto,
      status: "pending_review",
      isAvailable: false,
      isBusy: false,
      currentOrderId: null,
      currentLocation: {
        lat: null,
        lng: null,
        accuracy: null,
        heading: null,
        speed: null,
        updatedAt: null,
      },
    });

    await UserModel.findByIdAndUpdate(req.user._id, {
      riderApplicationStatus: "pending_review",
    });

    res.status(201).json(rider);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/me", protect, async (req: any, res: any) => {
  try {
    const rider = await RiderModel.findOne({ userId: req.user._id }).populate(
      "userId",
      "name email phone"
    );

    if (!rider) {
      return res.status(404).json({ message: "Rider profile not found" });
    }

    res.json(rider);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/availability", protect, async (req: any, res: any) => {
  try {
    const { isAvailable, lat, lng, accuracy, heading, speed } = req.body;

    const rider = await RiderModel.findOne({ userId: req.user._id });

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    if (rider.status !== "approved") {
      return res.status(403).json({
        message: "Rider account is not approved yet",
      });
    }

    if (rider.isBusy && isAvailable) {
      return res.status(400).json({
        message: "You cannot go available while you have an active delivery",
      });
    }

    rider.isAvailable = Boolean(isAvailable);

    if (hasValidCoords(lat, lng)) {
      rider.currentLocation = {
        lat: Number(lat),
        lng: Number(lng),
        accuracy: accuracy ?? null,
        heading: heading ?? null,
        speed: speed ?? null,
        updatedAt: new Date(),
      };
    }

    await rider.save();

    const io = req.app.get("io");

    if (io) {
      io.to("admin_room").emit("rider:availability_update", {
        riderId: rider._id,
        userId: req.user._id,
        isAvailable: rider.isAvailable,
        isBusy: rider.isBusy,
        currentLocation: rider.currentLocation,
      });

      io.to(`user_${req.user._id}`).emit("rider:availability_update", {
        riderId: rider._id,
        userId: req.user._id,
        isAvailable: rider.isAvailable,
        isBusy: rider.isBusy,
        currentLocation: rider.currentLocation,
      });
    }

    res.json(rider);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/location", protect, async (req: any, res: any) => {
  try {
    const { lat, lng, accuracy, heading, speed } = req.body;

    if (!hasValidCoords(lat, lng)) {
      return res.status(400).json({ message: "Invalid rider GPS location" });
    }

    const rider = await RiderModel.findOne({ userId: req.user._id });

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    rider.currentLocation = {
      lat: Number(lat),
      lng: Number(lng),
      accuracy: accuracy ?? null,
      heading: heading ?? null,
      speed: speed ?? null,
      updatedAt: new Date(),
    };

    await rider.save();

    const io = req.app.get("io");

    const locationPayload = {
      riderId: rider._id,
      userId: req.user._id,
      lat: Number(lat),
      lng: Number(lng),
      accuracy: accuracy ?? null,
      heading: heading ?? null,
      speed: speed ?? null,
      updatedAt: rider.currentLocation.updatedAt,
    };

    if (io) {
      io.to("admin_room").emit("rider:location_update", locationPayload);
      io.to(`rider_${rider._id}`).emit("rider:location_update", locationPayload);
      io.to(`user_${req.user._id}`).emit("rider:location_update", locationPayload);

      if (rider.currentOrderId) {
        await OrderModel.findByIdAndUpdate(rider.currentOrderId, {
          riderLocation: rider.currentLocation,
        });

        io.to(`order_${rider.currentOrderId}`).emit("rider:location_update", {
          ...locationPayload,
          orderId: rider.currentOrderId,
        });
      }
    }

    res.json({
      success: true,
      currentLocation: rider.currentLocation,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/available-orders", protect, async (req: any, res: any) => {
  try {
    const rider = await RiderModel.findOne({ userId: req.user._id });

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    if (rider.status !== "approved") {
      return res.status(403).json({ message: "Rider is not approved yet" });
    }

    if (!rider.isAvailable || rider.isBusy) {
      return res.json([]);
    }

    const orders = await OrderModel.find({
      rider: { $in: [null, undefined] },
      status: "READY_FOR_PICKUP",
      paymentStatus: { $in: ["PENDING", "PAID", "INITIATED"] },
    })
      .sort({ createdAt: 1 })
      .populate("restaurant")
      .populate("customer", "name phone email");

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/orders/available", protect, async (req: any, res: any) => {
  try {
    const rider = await RiderModel.findOne({ userId: req.user._id });

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    if (rider.status !== "approved") {
      return res.status(403).json({ message: "Rider is not approved yet" });
    }

    if (!rider.isAvailable || rider.isBusy) {
      return res.json([]);
    }

    const orders = await OrderModel.find({
      rider: { $in: [null, undefined] },
      status: "READY_FOR_PICKUP",
      paymentStatus: { $in: ["PENDING", "PAID", "INITIATED"] },
    })
      .sort({ createdAt: 1 })
      .populate("restaurant")
      .populate("customer", "name phone email");

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/orders/:orderId/accept", protect, async (req: any, res: any) => {
  try {
    const rider = await RiderModel.findOne({ userId: req.user._id });

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    if (rider.status !== "approved") {
      return res.status(403).json({ message: "Rider is not approved yet" });
    }

    if (!rider.isAvailable || rider.isBusy) {
      return res.status(400).json({
        message: "You must be available and not busy to accept an order",
      });
    }

    const order = await OrderModel.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.rider) {
      return res.status(400).json({ message: "Order already assigned to rider" });
    }

    if (order.status !== "READY_FOR_PICKUP") {
      return res.status(400).json({
        message: "Order is not ready for pickup yet",
      });
    }

    order.rider = req.user._id;
    order.riderProfile = rider._id;
    order.status = "PICKED_UP";
    order.assignedAt = new Date();
    order.riderLocation = rider.currentLocation || {};
    order.trackingEvents = order.trackingEvents || [];
    order.trackingEvents.push(
      addTrackingEvent("PICKED_UP", "Rider accepted and picked up the order.")
    );

    rider.isBusy = true;
    rider.isAvailable = false;
    rider.currentOrderId = order._id;

    await order.save();
    await rider.save();

    const populatedOrder = await populateOrder(order._id);

    const io = req.app.get("io");

    if (io) {
      io.to(`order_${order._id}`).emit("order:assigned", populatedOrder);
      io.to(`order_${order._id}`).emit("order:updated", populatedOrder);
      io.to(`chat_${order._id}`).emit("chat:participant_added", {
        orderId: order._id,
        riderId: rider._id,
        userId: req.user._id,
        role: "RIDER",
        message: "Rider joined this order chat.",
        createdAt: new Date(),
      });

      io.to(`user_${order.customer}`).emit("notification", {
        title: "Rider Picked Up",
        message: "A rider has picked up your order.",
        orderId: order._id,
        createdAt: new Date(),
      });

      io.to(`restaurant_${order.restaurant}`).emit("order:updated", populatedOrder);
      io.to(`user_${req.user._id}`).emit("order:assigned", populatedOrder);
      io.to("admin_room").emit("order:updated", populatedOrder);
    }

    res.json(populatedOrder);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/accept/:orderId", protect, async (req: any, res: any) => {
  req.params.orderId = req.params.orderId;
  return router.handle(
    { ...req, method: "POST", url: `/orders/${req.params.orderId}/accept` },
    res,
    () => {}
  );
});

router.get("/orders", protect, async (req: any, res: any) => {
  try {
    const orders = await OrderModel.find({
      rider: req.user._id,
      status: {
        $nin: ["DELIVERED", "CANCELLED", "REJECTED", "REFUNDED"],
      },
    })
      .sort("-createdAt")
      .populate("restaurant")
      .populate("customer", "name phone email")
      .populate("rider", "name phone email")
      .populate("riderProfile");

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/orders/:orderId/status", protect, async (req: any, res: any) => {
  try {
    const { status } = req.body;

    const rider = await RiderModel.findOne({ userId: req.user._id });

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    const order = await OrderModel.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (String(order.rider) !== String(req.user._id)) {
      return res.status(403).json({ message: "This order is not assigned to you" });
    }

    const allowedStatuses = ["PICKED_UP", "ON_THE_WAY", "DELIVERED"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid rider order status" });
    }

    order.status = status;
    order.trackingEvents = order.trackingEvents || [];
    order.trackingEvents.push(
      addTrackingEvent(status, `Rider updated order to ${status.replaceAll("_", " ")}.`)
    );

    if (status === "DELIVERED") {
      order.paymentStatus =
        order.paymentMethod === "CASH" ? "PAID" : order.paymentStatus;
      order.paidAt = order.paymentMethod === "CASH" ? new Date() : order.paidAt;

      rider.isBusy = false;
      rider.isAvailable = true;
      rider.currentOrderId = null;
      rider.totalDeliveries = Number(rider.totalDeliveries || 0) + 1;
      rider.totalEarnings = Number(rider.totalEarnings || 0) + 50;
    }

    await order.save();
    await rider.save();

    const populatedOrder = await populateOrder(order._id);
    emitOrderUpdate(req, populatedOrder);

    res.json(populatedOrder);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/complete-current-order", protect, async (req: any, res: any) => {
  try {
    const rider = await RiderModel.findOne({ userId: req.user._id });

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    if (!rider.currentOrderId) {
      return res.status(400).json({ message: "No active delivery found" });
    }

    const order = await OrderModel.findById(rider.currentOrderId);

    if (!order) {
      rider.isBusy = false;
      rider.currentOrderId = null;
      await rider.save();

      return res.status(404).json({ message: "Order not found" });
    }

    order.status = "DELIVERED";
    order.trackingEvents = order.trackingEvents || [];
    order.trackingEvents.push(
      addTrackingEvent("DELIVERED", "Order delivered successfully by rider.")
    );

    if (order.paymentMethod === "CASH") {
      order.paymentStatus = "PAID";
      order.paidAt = new Date();
    }

    rider.isBusy = false;
    rider.isAvailable = true;
    rider.currentOrderId = null;
    rider.totalDeliveries = Number(rider.totalDeliveries || 0) + 1;
    rider.totalEarnings = Number(rider.totalEarnings || 0) + 50;

    await order.save();
    await rider.save();

    const populatedOrder = await populateOrder(order._id);
    emitOrderUpdate(req, populatedOrder);

    res.json(populatedOrder);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;