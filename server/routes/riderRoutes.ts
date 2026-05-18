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

// REGISTER AS RIDER
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

// GET MY RIDER PROFILE
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

// UPDATE RIDER AVAILABILITY
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
    }

    res.json(rider);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE RIDER CURRENT LOCATION
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

    if (io) {
      io.to("admin_room").emit("rider:location_update", {
        riderId: rider._id,
        userId: req.user._id,
        lat: Number(lat),
        lng: Number(lng),
        accuracy: accuracy ?? null,
        heading: heading ?? null,
        speed: speed ?? null,
        updatedAt: rider.currentLocation.updatedAt,
      });
    }

    res.json({
      success: true,
      currentLocation: rider.currentLocation,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET ASSIGNED ORDERS FOR CURRENT RIDER
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

// MARK CURRENT DELIVERY COMPLETE MANUALLY
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
    order.trackingEvents.push({
      status: "DELIVERED",
      message: "Order delivered successfully by rider.",
      time: new Date(),
    });

    rider.isBusy = false;
    rider.isAvailable = true;
    rider.currentOrderId = null;
    rider.totalDeliveries = Number(rider.totalDeliveries || 0) + 1;
    rider.totalEarnings = Number(rider.totalEarnings || 0) + 50;

    await order.save();
    await rider.save();

    const populatedOrder = await OrderModel.findById(order._id)
      .populate("restaurant")
      .populate("customer", "name phone email")
      .populate("rider", "name phone email")
      .populate("riderProfile");

    const io = req.app.get("io");

    if (io) {
      io.to(`order_${order._id}`).emit("order:status_update", populatedOrder);
      io.to(`user_${order.customer}`).emit("notification", {
        title: "Order Delivered",
        message: "Your food has been delivered.",
        orderId: order._id,
      });
      io.to("admin_room").emit("order:updated", populatedOrder);
    }

    res.json(populatedOrder);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;