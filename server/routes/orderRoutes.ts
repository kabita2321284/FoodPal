import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import Stripe from "stripe";

import Order from "../models/Order";
import Restaurant from "../models/Restaurant";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

const OrderModel = Order as any;
const RestaurantModel = Restaurant as any;

let stripeClient: Stripe | null = null;

const getStripeClient = () => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (
    !stripeSecretKey ||
    stripeSecretKey.includes("your_stripe_secret_key") ||
    !stripeSecretKey.startsWith("sk_")
  ) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(stripeSecretKey);
  }

  return stripeClient;
};

const addTrackingEvent = (status: string, message: string) => ({
  status,
  message,
  time: new Date(),
});

const toRad = (value: number) => (value * Math.PI) / 180;

const calculateDistanceKm = (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
) => {
  const earthRadiusKm = 6371;

  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

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

const normalizePaymentMethod = (paymentMethod: any) => {
  const method = String(paymentMethod || "CASH").toUpperCase();

  if (["CASH", "CARD", "STRIPE", "ESEWA", "KHALTI", "WALLET"].includes(method)) {
    return method;
  }

  return "CASH";
};

const populateOrder = (id: string) => {
  return OrderModel.findById(id)
    .populate("customer", "name email phone")
    .populate("restaurant")
    .populate("rider", "name email phone")
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

  io.to(`order_${order._id}`).emit("order:status_update", order);
  io.to(`order_${order._id}`).emit("order:updated", order);
  io.to("admin_room").emit("order:updated", order);

  const customerId = order.customer?._id || order.customer;
  const restaurantId = order.restaurant?._id || order.restaurant;
  const riderId = order.rider?._id || order.rider;

  if (customerId) {
    io.to(`user_${customerId}`).emit("notification", {
      title: "Order Update",
      message: `Your order status is now ${order.status}`,
      orderId: order._id,
      createdAt: new Date(),
    });

    io.to(`user_${customerId}`).emit("order:updated", order);
  }

  if (restaurantId) {
    io.to(`restaurant_${restaurantId}`).emit("order:updated", order);
  }

  if (riderId) {
    io.to(`rider_${riderId}`).emit("order:updated", order);
    io.to(`user_${riderId}`).emit("order:updated", order);
  }
};

const markOrderPaid = async ({
  order,
  method,
  providerTransactionId,
  providerReference,
  rawResponse,
}: {
  order: any;
  method: "STRIPE" | "ESEWA" | "KHALTI" | "WALLET" | "CARD";
  providerTransactionId?: string;
  providerReference?: string;
  rawResponse?: any;
}) => {
  order.paymentMethod = method;
  order.paymentStatus = "PAID";
  order.paidAt = order.paidAt || new Date();

  if (providerTransactionId) {
    order.paymentProviderTransactionId = providerTransactionId;
  }

  if (providerReference) {
    order.paymentReference = providerReference;
  }

  order.paymentHistory = order.paymentHistory || [];

  order.paymentHistory.push({
    method,
    status: "PAID",
    providerTransactionId: providerTransactionId || "",
    providerReference: providerReference || "",
    amount: order.totalAmount || 0,
    currency: order.currency || "GBP",
    rawResponse: rawResponse || null,
    createdAt: new Date(),
  });

  order.trackingEvents = order.trackingEvents || [];

  order.trackingEvents.push(
    addTrackingEvent("PAYMENT_SUCCESS", `${method} payment completed successfully.`)
  );

  await order.save();

  return order;
};

// CREATE ORDER
router.post("/", protect, async (req: any, res: any) => {
  try {
    const {
      items,
      restaurant,
      subtotal,
      totalAmount,
      deliveryFee,
      platformFee,
      discountAmount,
      taxAmount,
      surgeFee,
      deliveryAddress,
      paymentMethod,
      promoCode,
      customerNote,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "No order items",
      });
    }

    if (!restaurant) {
      return res.status(400).json({
        message: "Restaurant is required",
      });
    }

    if (!deliveryAddress?.text) {
      return res.status(400).json({
        message: "Delivery address is required",
      });
    }

    const restaurantDoc: any = await RestaurantModel.findById(restaurant);

    if (!restaurantDoc) {
      return res.status(404).json({
        message: "Restaurant not found",
      });
    }

    const finalPaymentMethod = normalizePaymentMethod(paymentMethod);

    const restaurantAddress = {
      text: restaurantDoc.address?.text || "",
      lat: restaurantDoc.address?.lat ?? null,
      lng: restaurantDoc.address?.lng ?? null,
      placeId: restaurantDoc.address?.placeId || "",
    };

    let deliveryDistanceKm = 0;

    if (
      hasValidCoords(restaurantAddress.lat, restaurantAddress.lng) &&
      hasValidCoords(deliveryAddress.lat, deliveryAddress.lng)
    ) {
      deliveryDistanceKm = Number(
        calculateDistanceKm(
          {
            lat: Number(restaurantAddress.lat),
            lng: Number(restaurantAddress.lng),
          },
          {
            lat: Number(deliveryAddress.lat),
            lng: Number(deliveryAddress.lng),
          }
        ).toFixed(2)
      );
    }

    const order = await OrderModel.create({
      customer: req.user._id,
      restaurant,
      items,
      subtotal: Number(subtotal || 0),
      totalAmount: Number(totalAmount || 0),
      deliveryFee: Number(deliveryFee || 0),
      platformFee: Number(platformFee || 0),
      discountAmount: Number(discountAmount || 0),
      taxAmount: Number(taxAmount || 0),
      surgeFee: Number(surgeFee || 0),
      deliveryAddress,
      restaurantAddress,
      paymentMethod: finalPaymentMethod,
      paymentStatus: finalPaymentMethod === "CASH" ? "PENDING" : "INITIATED",
      promoCode: promoCode || "",
      customerNote: customerNote || "",
      deliveryDistanceKm,
      status: "PENDING",
      trackingEvents: [
        addTrackingEvent("PENDING", "Order placed successfully."),
      ],
      paymentHistory: [
        {
          method: finalPaymentMethod,
          status: finalPaymentMethod === "CASH" ? "PENDING" : "INITIATED",
          amount: Number(totalAmount || 0),
          currency: "GBP",
          createdAt: new Date(),
        },
      ],
    });

    const populatedOrder = await populateOrder(order._id);

    const io = req.app.get("io");

    if (io) {
      io.to("admin_room").emit("order:new", populatedOrder);
      io.to(`restaurant_${restaurant}`).emit("order:new", populatedOrder);
      io.to(`user_${req.user._id}`).emit("order:new", populatedOrder);
    }

    res.status(201).json(populatedOrder);
  } catch (error: any) {
    console.error("Create order error:", error);

    res.status(500).json({
      message: error.message || "Failed to create order",
    });
  }
});

// STRIPE PAYMENT SESSION
router.post("/:id/create-stripe-session", protect, async (req: any, res: any) => {
  try {
    const stripe = getStripeClient();

    if (!stripe) {
      return res.status(500).json({
        message:
          "Stripe is not configured properly. Check STRIPE_SECRET_KEY in your .env file and restart the server.",
      });
    }

    const order = await OrderModel.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const customerId = String(order.customer);

    if (String(req.user._id) !== customerId && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Not authorized to pay for this order",
      });
    }

    if (order.paymentStatus === "PAID") {
      return res.status(400).json({
        message: "Order is already paid",
      });
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

    const currency = String(order.currency || "GBP").toLowerCase();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `FoodPal Order #${String(order._id).slice(-6).toUpperCase()}`,
              description: `${order.items?.length || 1} item(s) from FoodPal`,
            },
            unit_amount: Math.max(1, Math.round(Number(order.totalAmount || 0) * 100)),
          },
          quantity: 1,
        },
      ],

      success_url: `${clientUrl}/payment-success?orderId=${order._id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/payment-failed?orderId=${order._id}`,

      metadata: {
        orderId: String(order._id),
        customerId: String(order.customer),
        restaurantId: String(order.restaurant),
      },
    });

    order.paymentMethod = "STRIPE";
    order.paymentStatus = "INITIATED";
    order.stripeCheckoutSessionId = session.id;
    order.paymentReference = session.id;

    order.paymentHistory = order.paymentHistory || [];

    order.paymentHistory.push({
      method: "STRIPE",
      status: "INITIATED",
      providerTransactionId: session.id,
      providerReference: session.id,
      amount: order.totalAmount || 0,
      currency: order.currency || "GBP",
      rawResponse: {
        id: session.id,
        url: session.url,
        payment_status: session.payment_status,
      },
      createdAt: new Date(),
    });

    await order.save();

    res.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    console.error("Stripe session error:", error);

    res.status(500).json({
      message: error.message || "Failed to create Stripe checkout session",
    });
  }
});

// VERIFY STRIPE PAYMENT
router.post("/stripe/verify", protect, async (req: any, res: any) => {
  try {
    const stripe = getStripeClient();

    if (!stripe) {
      return res.status(500).json({
        message:
          "Stripe is not configured properly. Check STRIPE_SECRET_KEY in your .env file and restart the server.",
      });
    }

    const { sessionId, orderId } = req.body;

    if (!sessionId && !orderId) {
      return res.status(400).json({
        message: "sessionId or orderId is required",
      });
    }

    let order: any = null;
    let session: Stripe.Checkout.Session | null = null;

    if (sessionId) {
      session = await stripe.checkout.sessions.retrieve(sessionId);

      if (!session) {
        return res.status(400).json({
          message: "Invalid Stripe payment session",
        });
      }

      const finalOrderId = session.metadata?.orderId;

      if (!finalOrderId) {
        return res.status(400).json({
          message: "Order ID missing in Stripe session",
        });
      }

      order = await OrderModel.findById(finalOrderId);
    } else {
      order = await OrderModel.findById(orderId);
    }

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const customerId = String(order.customer);

    if (String(req.user._id) !== customerId && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Not authorized to verify this payment",
      });
    }

    if (!session && order.stripeCheckoutSessionId) {
      session = await stripe.checkout.sessions.retrieve(order.stripeCheckoutSessionId);
    }

    if (!session) {
      return res.status(400).json({
        message: "Stripe session not found for this order",
      });
    }

    if (session.payment_status === "paid") {
      order.stripePaymentIntentId = String(session.payment_intent || "");

      await markOrderPaid({
        order,
        method: "STRIPE",
        providerTransactionId: String(session.payment_intent || session.id),
        providerReference: session.id,
        rawResponse: session,
      });

      const populatedOrder = await populateOrder(order._id);

      emitOrderUpdate(req, populatedOrder);

      return res.json({
        success: true,
        message: "Payment verified successfully",
        order: populatedOrder,
      });
    }

    order.paymentStatus = "FAILED";
    order.paymentFailureReason = "Stripe payment not completed";
    order.paymentHistory = order.paymentHistory || [];

    order.paymentHistory.push({
      method: "STRIPE",
      status: "FAILED",
      providerTransactionId: String(session.payment_intent || session.id),
      providerReference: session.id,
      amount: order.totalAmount || 0,
      currency: order.currency || "GBP",
      rawResponse: session,
      createdAt: new Date(),
    });

    await order.save();

    res.status(400).json({
      success: false,
      message: "Payment not completed",
      paymentStatus: session.payment_status,
    });
  } catch (error: any) {
    console.error("Stripe verify error:", error);

    res.status(500).json({
      message: error.message || "Failed to verify Stripe payment",
    });
  }
});

// ESEWA INITIATE
router.post("/:id/esewa", protect, async (req: any, res: any) => {
  try {
    const order = await OrderModel.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const customerId = String(order.customer);

    if (String(req.user._id) !== customerId && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Not authorized to pay for this order",
      });
    }

    if (order.paymentStatus === "PAID") {
      return res.status(400).json({
        message: "Order is already paid",
      });
    }

    const transactionUuid = new mongoose.Types.ObjectId().toString();

    order.paymentMethod = "ESEWA";
    order.paymentStatus = "INITIATED";
    order.esewaTransactionUuid = transactionUuid;
    order.paymentReference = transactionUuid;

    order.paymentHistory = order.paymentHistory || [];

    order.paymentHistory.push({
      method: "ESEWA",
      status: "INITIATED",
      providerTransactionId: transactionUuid,
      providerReference: transactionUuid,
      amount: order.totalAmount || 0,
      currency: order.currency || "GBP",
      createdAt: new Date(),
    });

    await order.save();

    res.json({
      success: true,
      formData: {
        amount: order.totalAmount,
        tax_amount: 0,
        total_amount: order.totalAmount,
        transaction_uuid: transactionUuid,
        product_code: process.env.ESEWA_MERCHANT_ID || "EPAYTEST",
        product_service_charge: 0,
        product_delivery_charge: 0,
        success_url:
          process.env.ESEWA_SUCCESS_URL ||
          "http://localhost:5173/payment-success",
        failure_url:
          process.env.ESEWA_FAILURE_URL ||
          "http://localhost:5173/payment-failed",
      },
    });
  } catch (error: any) {
    console.error("eSewa initiate error:", error);

    res.status(500).json({
      message: error.message || "Failed to initiate eSewa payment",
    });
  }
});

// KHALTI INITIATE
router.post("/:id/khalti", protect, async (req: any, res: any) => {
  try {
    const order = await OrderModel.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const customerId = String(order.customer);

    if (String(req.user._id) !== customerId && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Not authorized to pay for this order",
      });
    }

    if (order.paymentStatus === "PAID") {
      return res.status(400).json({
        message: "Order is already paid",
      });
    }

    order.paymentMethod = "KHALTI";
    order.paymentStatus = "INITIATED";
    order.khaltiPidx = "";
    order.paymentReference = String(order._id);

    order.paymentHistory = order.paymentHistory || [];

    order.paymentHistory.push({
      method: "KHALTI",
      status: "INITIATED",
      providerReference: String(order._id),
      amount: order.totalAmount || 0,
      currency: order.currency || "GBP",
      createdAt: new Date(),
    });

    await order.save();

    res.json({
      success: true,
      payload: {
        return_url:
          process.env.KHALTI_RETURN_URL ||
          "http://localhost:5173/payment-success",
        website_url:
          process.env.KHALTI_WEBSITE_URL || "http://localhost:5173",
        amount: Math.max(1, Math.round(Number(order.totalAmount || 0) * 100)),
        purchase_order_id: String(order._id),
        purchase_order_name: `FoodPal Order #${String(order._id)
          .slice(-6)
          .toUpperCase()}`,
        customer_info: {
          name: req.user.name || "FoodPal Customer",
          email: req.user.email || "",
          phone: req.user.phone || "",
        },
      },
    });
  } catch (error: any) {
    console.error("Khalti initiate error:", error);

    res.status(500).json({
      message: error.message || "Failed to initiate Khalti payment",
    });
  }
});

// GET MY ORDERS
router.get("/myorders", protect, async (req: any, res: any) => {
  try {
    const orders = await OrderModel.find({
      customer: req.user._id,
    })
      .sort("-createdAt")
      .populate("restaurant")
      .populate("rider", "name email phone");

    res.json(orders);
  } catch (error: any) {
    console.error("Get my orders error:", error);

    res.status(500).json({
      message: error.message || "Failed to fetch orders",
    });
  }
});

// GET RESTAURANT ORDERS
router.get("/restaurant/:restaurantId", protect, async (req: any, res: any) => {
  try {
    const orders = await OrderModel.find({
      restaurant: req.params.restaurantId,
    })
      .sort("-createdAt")
      .populate("customer", "name email phone")
      .populate("restaurant")
      .populate("rider", "name email phone");

    res.json(orders);
  } catch (error: any) {
    console.error("Get restaurant orders error:", error);

    res.status(500).json({
      message: error.message || "Failed to fetch restaurant orders",
    });
  }
});

// GET SINGLE ORDER
router.get("/:id", protect, async (req: any, res: any) => {
  try {
    const order = await populateOrder(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    res.json(order);
  } catch (error: any) {
    console.error("Get order error:", error);

    res.status(500).json({
      message: error.message || "Failed to fetch order",
    });
  }
});

export default router;