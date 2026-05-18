import express from "express";
import Favorite from "../models/Favorite";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", protect, async (req: any, res: any) => {
  try {
    const favorites = await (Favorite as any)
      .find({ user: req.user._id })
      .populate("restaurant");

    res.json(favorites);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/:restaurantId", protect, async (req: any, res: any) => {
  try {
    const existing = await (Favorite as any).findOne({
      user: req.user._id,
      restaurant: req.params.restaurantId,
    });

    if (existing) {
      await existing.deleteOne();

      return res.json({
        success: true,
        favorited: false,
      });
    }

    await (Favorite as any).create({
      user: req.user._id,
      restaurant: req.params.restaurantId,
    });

    res.json({
      success: true,
      favorited: true,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;