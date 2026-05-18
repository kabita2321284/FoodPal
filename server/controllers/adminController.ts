import User from "../models/User";
import Restaurant from "../models/Restaurant";
import Order from "../models/Order";
import MenuItem from "../models/MenuItem";
import Category from "../models/Category";
import Rider from "../models/Rider";

const UserModel = User as any;
const RestaurantModel = Restaurant as any;
const OrderModel = Order as any;
const MenuItemModel = MenuItem as any;
const CategoryModel = Category as any;
const RiderModel = Rider as any;

const addTrackingEvent = (status: string, message: string) => ({
  status,
  message,
  time: new Date(),
});

// Categories
export const getCategories = async (req: any, res: any) => {
  try {
    const { restaurantId } = req.query;
    const filter = restaurantId ? { restaurant: restaurantId } : {};
    const categories = await CategoryModel.find(filter).populate("restaurant").sort("order");
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createCategory = async (req: any, res: any) => {
  try {
    const category = await CategoryModel.create(req.body);
    res.status(201).json(category);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateCategory = async (req: any, res: any) => {
  try {
    const category = await CategoryModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!category) return res.status(404).json({ message: "Category not found" });

    res.json(category);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteCategory = async (req: any, res: any) => {
  try {
    const itemCount = await MenuItemModel.countDocuments({ category: req.params.id });

    if (itemCount > 0) {
      return res.status(400).json({
        message: "Cannot delete category because it has menu items.",
      });
    }

    const category = await CategoryModel.findByIdAndDelete(req.params.id);

    if (!category) return res.status(404).json({ message: "Category not found" });

    res.json({ message: "Category deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Menu Items
export const getMenuItems = async (req: any, res: any) => {
  try {
    const { restaurantId } = req.query;
    const filter = restaurantId ? { restaurant: restaurantId } : {};

    const items = await MenuItemModel.find(filter)
      .populate("restaurant")
      .populate("category")
      .sort("-createdAt");

    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createMenuItem = async (req: any, res: any) => {
  try {
    const item = await MenuItemModel.create(req.body);
    res.status(201).json(item);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateMenuItem = async (req: any, res: any) => {
  try {
    const item = await MenuItemModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!item) return res.status(404).json({ message: "Menu item not found" });

    res.json(item);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteMenuItem = async (req: any, res: any) => {
  try {
    const item = await MenuItemModel.findByIdAndDelete(req.params.id);

    if (!item) return res.status(404).json({ message: "Menu item not found" });

    res.json({ message: "Menu item deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Stats
export const getAdminStats = async (req: any, res: any) => {
  try {
    const totalUsers = await UserModel.countDocuments({ role: "CUSTOMER" });
    const totalRestaurants = await RestaurantModel.countDocuments();
    const approvedRestaurants = await RestaurantModel.countDocuments({ status: "approved" });
    const pendingRestaurants = await RestaurantModel.countDocuments({ status: "pending_review" });
    const totalRiders = await UserModel.countDocuments({ role: "RIDER" });
    const pendingRiders = await UserModel.countDocuments({
      riderApplicationStatus: "pending_review",
    });
    const totalOrders = await OrderModel.countDocuments();

    const revenueData = await OrderModel.aggregate([
      { $match: { paymentStatus: "PAID" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    res.json({
      totalUsers,
      totalRestaurants,
      approvedRestaurants,
      pendingRestaurantApplications: pendingRestaurants,
      totalRiders,
      pendingRiderApplications: pendingRiders,
      totalOrders,
      totalRevenue: revenueData.length > 0 ? revenueData[0].total : 0,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Users
export const getUsers = async (req: any, res: any) => {
  try {
    const users = await UserModel.find({}).select("-password").sort("-createdAt");
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const blockUser = async (req: any, res: any) => {
  try {
    const { isBlocked } = req.body;

    const user = await UserModel.findByIdAndUpdate(
      req.params.id,
      { isBlocked },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// Restaurants
export const getRestaurants = async (req: any, res: any) => {
  try {
    const restaurants = await RestaurantModel.find({})
      .populate("owner", "name email phone role restaurantApplicationStatus")
      .sort("-createdAt");

    res.json(restaurants);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createRestaurant = async (req: any, res: any) => {
  try {
    const {
      owner,
      name,
      description,
      address,
      city,
      lat,
      lng,
      cuisine,
      images,
      logo,
      bannerImage,
      status,
      isOpen,
      openingHours,
      deliveryFee,
      minimumOrder,
      estimatedDeliveryTime,
      preparationTime,
      priceLevel,
      serviceRadiusKm,
      tags,
      commissionRate,
      isFeatured,
    } = req.body;

    if (!owner || !name) {
      return res.status(400).json({
        message: "Owner and restaurant name are required.",
      });
    }

    const finalLat = Number(lat || address?.lat || 0);
    const finalLng = Number(lng || address?.lng || 0);

    const restaurant = await RestaurantModel.create({
      owner,
      name,
      description: description || "",
      address: {
        text: typeof address === "string" ? address : address?.text || "",
        city: city || address?.city || "",
        lat: finalLat,
        lng: finalLng,
      },
      location: {
        type: "Point",
        coordinates: [finalLng || 85.324, finalLat || 27.717],
      },
      cuisine: cuisine || [],
      images: images || [],
      logo: logo || "",
      bannerImage: bannerImage || "",
      status: status || "approved",
      isOpen: isOpen ?? true,
      openingHours: openingHours || { open: "09:00", close: "22:00" },
      deliveryFee: deliveryFee ?? 50,
      minimumOrder: minimumOrder ?? 0,
      estimatedDeliveryTime: estimatedDeliveryTime ?? 30,
      preparationTime: preparationTime ?? 20,
      priceLevel: priceLevel || "MEDIUM",
      serviceRadiusKm: serviceRadiusKm ?? 5,
      tags: tags || [],
      commissionRate: commissionRate ?? 15,
      isFeatured: isFeatured ?? false,
    });

    await UserModel.findByIdAndUpdate(owner, {
      role: "RESTAURANT",
      restaurantApplicationStatus: restaurant.status,
    });

    res.status(201).json(restaurant);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateRestaurant = async (req: any, res: any) => {
  try {
    const restaurant: any = await RestaurantModel.findById(req.params.id);

    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    Object.assign(restaurant, req.body);

    if (req.body.address !== undefined || req.body.city !== undefined) {
      const text =
        typeof req.body.address === "string"
          ? req.body.address
          : req.body.address?.text || restaurant.address?.text || "";

      const city = req.body.city || req.body.address?.city || restaurant.address?.city || "";
      const lat = Number(req.body.lat || req.body.address?.lat || restaurant.address?.lat || 0);
      const lng = Number(req.body.lng || req.body.address?.lng || restaurant.address?.lng || 0);

      restaurant.address = { text, city, lat, lng };
      restaurant.location = {
        type: "Point",
        coordinates: [lng || 85.324, lat || 27.717],
      };
    }

    const updatedRestaurant = await restaurant.save();

    if (updatedRestaurant.owner) {
      const userUpdate: any = {
        restaurantApplicationStatus: updatedRestaurant.status,
      };

      if (updatedRestaurant.status === "approved") {
        userUpdate.role = "RESTAURANT";
      }

      await UserModel.findByIdAndUpdate(updatedRestaurant.owner, userUpdate, {
        runValidators: false,
      });
    }

    res.json(updatedRestaurant);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateRestaurantStatus = async (req: any, res: any) => {
  try {
    const { status, rejectionReason } = req.body;

    const allowedStatuses = ["pending_review", "approved", "rejected", "suspended"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid restaurant status" });
    }

    const restaurant: any = await RestaurantModel.findById(req.params.id);

    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    restaurant.status = status;

    if (status === "rejected") {
      restaurant.rejectionReason = rejectionReason || "Restaurant application rejected.";
    }

    const updatedRestaurant = await restaurant.save();

    const userUpdate: any = {
      restaurantApplicationStatus: status,
    };

    if (status === "approved") {
      userUpdate.role = "RESTAURANT";
      userUpdate.isVerified = true;
    }

    if (status === "rejected") {
      userUpdate.rejectionReason = rejectionReason || "Restaurant application rejected.";
    }

    await UserModel.findByIdAndUpdate(updatedRestaurant.owner, userUpdate, {
      runValidators: false,
    });

    res.json(updatedRestaurant);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteRestaurant = async (req: any, res: any) => {
  try {
    const restaurant = await RestaurantModel.findByIdAndDelete(req.params.id);

    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    await CategoryModel.deleteMany({ restaurant: req.params.id });
    await MenuItemModel.deleteMany({ restaurant: req.params.id });

    res.json({ message: "Restaurant deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Riders
export const getRiders = async (req: any, res: any) => {
  try {
    const riders = await UserModel.find({
      $or: [{ role: "RIDER" }, { riderApplicationStatus: { $ne: "none" } }],
    })
      .select("-password")
      .sort("-createdAt");

    res.json(riders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateRiderStatus = async (req: any, res: any) => {
  try {
    const { status, role, rejectionReason } = req.body;

    const allowedStatuses = ["none", "pending_review", "approved", "rejected"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid rider status" });
    }

    const updateData: any = {};

    if (role) updateData.role = role;

    if (status === "approved") {
      updateData.role = "RIDER";
      updateData.isVerified = true;
      updateData.riderApplicationStatus = "approved";
      updateData.rejectionReason = "";
    } else if (status === "rejected") {
      updateData.riderApplicationStatus = "rejected";
      updateData.rejectionReason = rejectionReason || "Rider application rejected.";
    } else if (status === "none") {
      updateData.role = "CUSTOMER";
      updateData.riderApplicationStatus = "none";
      updateData.rejectionReason = "";
    } else if (status) {
      updateData.riderApplicationStatus = status;
    }

    const user: any = await UserModel.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: false,
    }).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    await RiderModel.findOneAndUpdate(
      {
        $or: [{ user: user._id }, { userId: user._id }, { email: user.email }],
      },
      {
        status: status || user.riderApplicationStatus,
        riderApplicationStatus: status || user.riderApplicationStatus,
        isApproved: status === "approved",
        rejectionReason:
          status === "rejected"
            ? rejectionReason || "Rider application rejected."
            : "",
      },
      {
        new: true,
        runValidators: false,
      }
    );

    res.json(user);
  } catch (error: any) {
    console.error("Update rider status error:", error);
    res.status(400).json({ message: error.message });
  }
};

export const deleteRider = async (req: any, res: any) => {
  try {
    const user: any = await UserModel.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "Rider user not found" });
    }

    await RiderModel.deleteMany({
      $or: [{ user: user._id }, { userId: user._id }, { email: user.email }],
    });

    const updatedUser = await UserModel.findByIdAndUpdate(
      req.params.id,
      {
        role: "CUSTOMER",
        riderApplicationStatus: "none",
        rejectionReason: "",
      },
      {
        new: true,
        runValidators: false,
      }
    ).select("-password");

    res.json({
      message: "Rider profile removed successfully",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Delete rider error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Orders
export const getOrders = async (req: any, res: any) => {
  try {
    const orders = await OrderModel.find({})
      .populate("customer", "name email phone")
      .populate("restaurant")
      .populate("rider", "name email phone")
      .sort("-createdAt");

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderStatus = async (req: any, res: any) => {
  try {
    const { status, message } = req.body;

    const order: any = await OrderModel.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = status;

    order.trackingEvents.push(
      addTrackingEvent(
        status,
        message || `Order status changed to ${status.replaceAll("_", " ")}`
      )
    );

    await order.save();

    const updatedOrder = await OrderModel.findById(order._id)
      .populate("customer", "name email phone")
      .populate("restaurant")
      .populate("rider", "name email phone");

    const io = req.app.get("io");

    if (io) {
      io.to(`order_${order._id}`).emit("order:status_update", updatedOrder);
      io.to(`user_${order.customer}`).emit("notification", {
        title: "Order Updated",
        message: `Your order is now ${status.replaceAll("_", " ")}`,
        orderId: order._id,
      });
    }

    res.json(updatedOrder);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};