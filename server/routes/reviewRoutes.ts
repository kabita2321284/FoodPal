import express from "express";
import Review from "../models/Review";
import Restaurant from "../models/Restaurant";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

const updateRestaurantRating = async (restaurantId: string) => {
  const reviews = await (Review as any).find({ restaurant: restaurantId });

  const numReviews = reviews.length;
  const rating =
    numReviews === 0
      ? 0
      : reviews.reduce((acc: number, item: any) => acc + item.rating, 0) /
        numReviews;

  await (Restaurant as any).findByIdAndUpdate(restaurantId, {
    rating: Number(rating.toFixed(1)),
    numReviews,
  });
};

router.get("/restaurant/:restaurantId", async (req, res) => {
  try {
    const reviews = await (Review as any)
      .find({ restaurant: req.params.restaurantId })
      .populate("user", "name")
      .sort("-createdAt");

    res.json(reviews);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", protect, async (req: any, res: any) => {
  try {
    const { restaurant, rating, comment } = req.body;

    const review = await (Review as any).findOneAndUpdate(
      {
        user: req.user._id,
        restaurant,
      },
      {
        user: req.user._id,
        restaurant,
        rating,
        comment,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    await updateRestaurantRating(restaurant);

    res.status(201).json(review);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

export default router;