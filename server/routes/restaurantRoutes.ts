import express from "express";
import Restaurant from "../models/Restaurant";
import Category from "../models/Category";
import MenuItem from "../models/MenuItem";
import User from "../models/User";
import { protect } from "../middleware/authMiddleware";
import {
  getMyRestaurantOrders,
  updateOrderStatus,
  getMyMenuItems,
  getMyCategories,
  createMyMenuItem,
  updateMyMenuItem,
  deleteMyMenuItem,
  createMyCategory,
  updateMyCategory,
  deleteMyCategory,
} from "../controllers/restaurantController";

const router = express.Router();

const RestaurantModel = Restaurant as any;
const UserModel = User as any;
const MenuItemModel = MenuItem as any;
const CategoryModel = Category as any;

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

const buildLocation = (lat: any, lng: any) => {
  if (hasValidCoords(lat, lng)) {
    return {
      type: "Point",
      coordinates: [Number(lng), Number(lat)],
    };
  }

  return {
    type: "Point",
    coordinates: [0, 0],
  };
};

router.get("/my/orders", protect, getMyRestaurantOrders);
router.patch("/my/orders/:id/status", protect, updateOrderStatus);

router.get("/my/menu-items", protect, getMyMenuItems);
router.post("/my/menu-items", protect, createMyMenuItem);
router.put("/my/menu-items/:id", protect, updateMyMenuItem);
router.delete("/my/menu-items/:id", protect, deleteMyMenuItem);

router.get("/my/categories", protect, getMyCategories);
router.post("/my/categories", protect, createMyCategory);
router.put("/my/categories/:id", protect, updateMyCategory);
router.delete("/my/categories/:id", protect, deleteMyCategory);

// Register restaurant
router.post("/register", protect, async (req: any, res: any) => {
  try {
    const {
      name,
      description,
      address,
      cuisine,
      images,
      logo,
      bannerImage,
      openingHours,
      weeklyOpeningHours,
      deliveryFee,
      minimumOrder,
      estimatedDeliveryTime,
      preparationTime,
      averagePrepTime,
      busyPrepTimeExtra,
      pickupBufferMinutes,
      deliverySpeedKmph,
      priceLevel,
      serviceRadiusKm,
      tags,
    } = req.body;

    const existingRestaurant = await RestaurantModel.findOne({
      owner: req.user._id,
    });

    if (existingRestaurant) {
      return res.status(400).json({
        message:
          "You already have a restaurant registered or application pending.",
      });
    }

    if (!name || !address?.text) {
      return res.status(400).json({
        message: "Restaurant name and address are required.",
      });
    }

    if (!hasValidCoords(address.lat, address.lng)) {
      return res.status(400).json({
        message:
          "Please select a real restaurant address from Google suggestions so GPS can be saved.",
      });
    }

    const lat = Number(address.lat);
    const lng = Number(address.lng);

    const restaurant = await RestaurantModel.create({
      owner: req.user._id,
      name,
      description: description || "",
      address: {
        text: address.text,
        city: address.city || "",
        lat,
        lng,
        placeId: address.placeId || "",
      },
      location: buildLocation(lat, lng),
      cuisine: cuisine || [],
      images: images || [],
      logo: logo || "",
      bannerImage: bannerImage || "",
      openingHours: openingHours || {
        open: "09:00",
        close: "22:00",
      },
      weeklyOpeningHours,
      deliveryFee: deliveryFee ?? 50,
      minimumOrder: minimumOrder ?? 0,
      estimatedDeliveryTime: estimatedDeliveryTime ?? 30,
      preparationTime: preparationTime ?? 20,
      averagePrepTime: averagePrepTime ?? preparationTime ?? 20,
      busyPrepTimeExtra: busyPrepTimeExtra ?? 10,
      pickupBufferMinutes: pickupBufferMinutes ?? 5,
      deliverySpeedKmph: deliverySpeedKmph ?? 22,
      priceLevel: priceLevel || "MEDIUM",
      serviceRadiusKm: serviceRadiusKm ?? 5,
      tags: tags || [],
      status: "pending_review",
      isBusy: false,
    });

    await UserModel.findByIdAndUpdate(req.user._id, {
      restaurantApplicationStatus: "pending_review",
    });

    res.status(201).json(restaurant);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get my restaurant
router.get("/me", protect, async (req: any, res: any) => {
  try {
    const restaurant = await RestaurantModel.findOne({
      owner: req.user._id,
    });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.json(restaurant);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update my restaurant
router.put("/me", protect, async (req: any, res: any) => {
  try {
    const restaurant: any = await RestaurantModel.findOne({
      owner: req.user._id,
    });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const fields = req.body;

    if (fields.name !== undefined) restaurant.name = fields.name;
    if (fields.description !== undefined)
      restaurant.description = fields.description;
    if (fields.cuisine !== undefined) restaurant.cuisine = fields.cuisine;
    if (fields.images !== undefined) restaurant.images = fields.images;
    if (fields.logo !== undefined) restaurant.logo = fields.logo;
    if (fields.bannerImage !== undefined)
      restaurant.bannerImage = fields.bannerImage;
    if (fields.openingHours !== undefined)
      restaurant.openingHours = fields.openingHours;
    if (fields.weeklyOpeningHours !== undefined)
      restaurant.weeklyOpeningHours = fields.weeklyOpeningHours;
    if (fields.deliveryFee !== undefined)
      restaurant.deliveryFee = Number(fields.deliveryFee);
    if (fields.minimumOrder !== undefined)
      restaurant.minimumOrder = Number(fields.minimumOrder);
    if (fields.estimatedDeliveryTime !== undefined)
      restaurant.estimatedDeliveryTime = Number(fields.estimatedDeliveryTime);
    if (fields.preparationTime !== undefined)
      restaurant.preparationTime = Number(fields.preparationTime);
    if (fields.averagePrepTime !== undefined)
      restaurant.averagePrepTime = Number(fields.averagePrepTime);
    if (fields.busyPrepTimeExtra !== undefined)
      restaurant.busyPrepTimeExtra = Number(fields.busyPrepTimeExtra);
    if (fields.pickupBufferMinutes !== undefined)
      restaurant.pickupBufferMinutes = Number(fields.pickupBufferMinutes);
    if (fields.deliverySpeedKmph !== undefined)
      restaurant.deliverySpeedKmph = Number(fields.deliverySpeedKmph);
    if (fields.priceLevel !== undefined) restaurant.priceLevel = fields.priceLevel;
    if (fields.serviceRadiusKm !== undefined)
      restaurant.serviceRadiusKm = Number(fields.serviceRadiusKm);
    if (fields.tags !== undefined) restaurant.tags = fields.tags;
    if (fields.isOpen !== undefined) restaurant.isOpen = Boolean(fields.isOpen);
    if (fields.isBusy !== undefined) restaurant.isBusy = Boolean(fields.isBusy);

    if (fields.address?.text) {
      const lat = Number(fields.address.lat);
      const lng = Number(fields.address.lng);

      if (!hasValidCoords(lat, lng)) {
        return res.status(400).json({
          message:
            "Please select a real restaurant address from Google suggestions so GPS can be saved.",
        });
      }

      restaurant.address = {
        text: fields.address.text,
        city: fields.address.city || restaurant.address.city || "",
        lat,
        lng,
        placeId: fields.address.placeId || restaurant.address.placeId || "",
      };

      restaurant.location = buildLocation(lat, lng);
    }

    const updatedRestaurant = await restaurant.save();
    res.json(updatedRestaurant);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle open / closed
router.patch("/me/open-status", protect, async (req: any, res: any) => {
  try {
    const { isOpen } = req.body;

    const restaurant = await RestaurantModel.findOneAndUpdate(
      { owner: req.user._id },
      { isOpen: Boolean(isOpen) },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const io = req.app.get("io");

    if (io) {
      io.to(`restaurant_${restaurant._id}`).emit("restaurant:updated", restaurant);
      io.to("admin_room").emit("restaurant:updated", restaurant);
    }

    res.json(restaurant);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ETA settings + busy mode
router.patch("/me/eta-settings", protect, async (req: any, res: any) => {
  try {
    const {
      preparationTime,
      averagePrepTime,
      busyPrepTimeExtra,
      pickupBufferMinutes,
      deliverySpeedKmph,
      serviceRadiusKm,
      estimatedDeliveryTime,
      isBusy,
    } = req.body;

    const restaurant: any = await RestaurantModel.findOne({
      owner: req.user._id,
    });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    if (preparationTime !== undefined)
      restaurant.preparationTime = Math.max(1, Number(preparationTime));

    if (averagePrepTime !== undefined)
      restaurant.averagePrepTime = Math.max(1, Number(averagePrepTime));

    if (busyPrepTimeExtra !== undefined)
      restaurant.busyPrepTimeExtra = Math.max(0, Number(busyPrepTimeExtra));

    if (pickupBufferMinutes !== undefined)
      restaurant.pickupBufferMinutes = Math.max(0, Number(pickupBufferMinutes));

    if (deliverySpeedKmph !== undefined)
      restaurant.deliverySpeedKmph = Math.max(1, Number(deliverySpeedKmph));

    if (serviceRadiusKm !== undefined)
      restaurant.serviceRadiusKm = Math.max(0, Number(serviceRadiusKm));

    if (estimatedDeliveryTime !== undefined)
      restaurant.estimatedDeliveryTime = Math.max(
        1,
        Number(estimatedDeliveryTime)
      );

    if (isBusy !== undefined) restaurant.isBusy = Boolean(isBusy);

    const basePrep = Number(
      restaurant.averagePrepTime || restaurant.preparationTime || 20
    );
    const busyExtra = restaurant.isBusy
      ? Number(restaurant.busyPrepTimeExtra || 0)
      : 0;
    const pickupBuffer = Number(restaurant.pickupBufferMinutes || 5);

    restaurant.preparationTime = basePrep;
    restaurant.estimatedDeliveryTime = Math.max(
      10,
      basePrep + busyExtra + pickupBuffer + 15
    );

    const updatedRestaurant = await restaurant.save();

    const io = req.app.get("io");

    if (io) {
      io.to(`restaurant_${restaurant._id}`).emit(
        "restaurant:eta_updated",
        updatedRestaurant
      );
      io.to("admin_room").emit("restaurant:updated", updatedRestaurant);
    }

    res.json(updatedRestaurant);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get all restaurants
router.get("/", async (req: any, res: any) => {
  try {
    const {
      cuisine,
      search,
      lat,
      lng,
      isOpen,
      priceLevel,
      sortBy,
      minRating,
    } = req.query;

    const query: any = { status: "approved" };

    if (cuisine) {
      query.cuisine = { $in: [new RegExp(cuisine, "i")] };
    }

    if (isOpen !== undefined) {
      query.isOpen = isOpen === "true";
    }

    if (priceLevel) {
      query.priceLevel = priceLevel;
    }

    if (minRating) {
      query.rating = { $gte: Number(minRating) };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { cuisine: { $in: [new RegExp(search, "i")] } },
        { tags: { $in: [new RegExp(search, "i")] } },
        { "address.text": { $regex: search, $options: "i" } },
      ];

      const matchingItems = await MenuItemModel.find({
        name: { $regex: search, $options: "i" },
        isAvailable: true,
      }).select("restaurant");

      if (matchingItems.length > 0) {
        const restaurantIds = matchingItems.map((item: any) => item.restaurant);
        query.$or.push({ _id: { $in: restaurantIds } });
      }
    }

    let restaurants;

    if (lat && lng && hasValidCoords(lat, lng)) {
      restaurants = await RestaurantModel.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [parseFloat(lng), parseFloat(lat)],
            },
            distanceField: "distance",
            maxDistance: 10000000,
            query,
            spherical: true,
          },
        },
        {
          $addFields: {
            distanceKm: { $divide: ["$distance", 1000] },
          },
        },
        {
          $match: {
            $expr: {
              $lte: ["$distanceKm", "$serviceRadiusKm"],
            },
          },
        },
        {
          $sort:
            sortBy === "rating"
              ? { rating: -1 }
              : sortBy === "deliveryTime"
              ? { estimatedDeliveryTime: 1 }
              : { distance: 1 },
        },
      ]);
    } else {
      let sort: any = { isFeatured: -1, rating: -1 };

      if (sortBy === "deliveryTime") sort = { estimatedDeliveryTime: 1 };
      if (sortBy === "deliveryFee") sort = { deliveryFee: 1 };
      if (sortBy === "rating") sort = { rating: -1 };

      restaurants = await RestaurantModel.find(query).sort(sort);
    }

    res.json(restaurants);
  } catch (error: any) {
    console.error("Restaurant Search Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get restaurant detail
router.get("/:id", async (req: any, res: any) => {
  try {
    const restaurant = await RestaurantModel.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const categories = await CategoryModel.find({
      restaurant: restaurant._id,
    }).sort("order");

    const menuItems = await MenuItemModel.find({
      restaurant: restaurant._id,
      isAvailable: true,
    }).populate("category");

    res.json({
      restaurant,
      categories,
      menuItems,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;