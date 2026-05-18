import express from "express";
import PromoCode from "../models/PromoCode";
import { protect, admin } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", protect, admin, async (req: any, res: any) => {
  try {
    const promos = await (PromoCode as any)
      .find({})
      .populate("restaurant", "name")
      .sort("-createdAt");

    res.json(promos);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", protect, admin, async (req: any, res: any) => {
  try {
    const promo = await (PromoCode as any).create(req.body);
    res.status(201).json(promo);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/validate", protect, async (req: any, res: any) => {
  try {
    const { code, orderAmount, restaurantId } = req.body;

    const promo = await (PromoCode as any).findOne({
      code: String(code).toUpperCase(),
      isActive: true,
    });

    if (!promo) {
      return res.status(404).json({ message: "Invalid promo code" });
    }

    if (new Date(promo.expiresAt) < new Date()) {
      return res.status(400).json({ message: "Promo code expired" });
    }

    if (orderAmount < promo.minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order amount is Rs. ${promo.minOrderAmount}`,
      });
    }

    if (promo.restaurant && promo.restaurant.toString() !== restaurantId) {
      return res.status(400).json({
        message: "Promo code is not valid for this restaurant",
      });
    }

    if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
      return res.status(400).json({ message: "Promo usage limit reached" });
    }

    let discount = 0;

    if (promo.discountType === "PERCENTAGE") {
      discount = (orderAmount * promo.discountValue) / 100;
      if (promo.maxDiscount > 0) {
        discount = Math.min(discount, promo.maxDiscount);
      }
    } else {
      discount = promo.discountValue;
    }

    discount = Math.min(discount, orderAmount);

    res.json({
      valid: true,
      code: promo.code,
      title: promo.title,
      discount,
      finalAmount: orderAmount - discount,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:id", protect, admin, async (req: any, res: any) => {
  try {
    const promo = await (PromoCode as any).findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!promo) {
      return res.status(404).json({ message: "Promo not found" });
    }

    res.json(promo);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/:id", protect, admin, async (req: any, res: any) => {
  try {
    const promo = await (PromoCode as any).findByIdAndDelete(req.params.id);

    if (!promo) {
      return res.status(404).json({ message: "Promo not found" });
    }

    res.json({ message: "Promo deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;