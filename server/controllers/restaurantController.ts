import Restaurant from "../models/Restaurant";
import Order from "../models/Order";
import MenuItem from "../models/MenuItem";
import Category from "../models/Category";

const RestaurantModel = Restaurant as any;
const OrderModel = Order as any;
const MenuItemModel = MenuItem as any;
const CategoryModel = Category as any;

const addTrackingEvent = (status: string, message: string) => ({
  status,
  message,
  time: new Date(),
});

export const getMyRestaurantOrders = async (req: any, res: any) => {
  try {
    const restaurant = await RestaurantModel.findOne({ owner: req.user._id });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const orders = await OrderModel.find({ restaurant: restaurant._id })
      .populate("customer", "name email phone")
      .populate("rider", "name phone")
      .populate("restaurant")
      .sort("-createdAt");

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateOrderStatus = async (req: any, res: any) => {
  try {
    const { status, message, rejectionReason, cancellationReason } = req.body;

    const allowedStatuses = [
      "PENDING",
      "ACCEPTED",
      "PREPARING",
      "READY_FOR_PICKUP",
      "PICKED_UP",
      "ON_THE_WAY",
      "DELIVERED",
      "CANCELLED",
      "REJECTED",
      "REFUNDED",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const order = await OrderModel.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const restaurant = await RestaurantModel.findOne({ owner: req.user._id });

    if (
      order.restaurant.toString() !== restaurant?._id.toString() &&
      req.user.role !== "ADMIN"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    order.status = status;

    if (rejectionReason) order.rejectionReason = rejectionReason;
    if (cancellationReason) order.cancellationReason = cancellationReason;

    order.trackingEvents.push(
      addTrackingEvent(
        status,
        message || `Order status changed to ${status.replaceAll("_", " ")}`
      )
    );

    await order.save();

    const updatedOrder = await OrderModel.findById(order._id)
      .populate("customer", "name email phone")
      .populate("rider", "name phone")
      .populate("restaurant");

    const io = req.app.get("io");

    if (io) {
      io.to(`order_${order._id}`).emit("order:status_update", updatedOrder);

      io.to(`user_${order.customer}`).emit("notification", {
        title: "Order Updated",
        message: `Your order is now ${status.replaceAll("_", " ")}`,
        orderId: order._id,
      });

      io.to(`restaurant_${order.restaurant}`).emit("order:updated", updatedOrder);

      if (order.rider) {
        io.to(`user_${order.rider}`).emit("order:updated", updatedOrder);
      }
    }

    res.json(updatedOrder);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyMenuItems = async (req: any, res: any) => {
  try {
    const restaurant = await RestaurantModel.findOne({ owner: req.user._id });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const items = await MenuItemModel.find({ restaurant: restaurant._id })
      .populate("category")
      .sort("-createdAt");

    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyCategories = async (req: any, res: any) => {
  try {
    const restaurant = await RestaurantModel.findOne({ owner: req.user._id });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const categories = await CategoryModel.find({
      restaurant: restaurant._id,
    }).sort("order");

    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createMyMenuItem = async (req: any, res: any) => {
  try {
    const restaurant = await RestaurantModel.findOne({ owner: req.user._id });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const {
      name,
      description,
      price,
      originalPrice,
      image,
      category,
      variants,
      addons,
      isAvailable,
      isVegetarian,
      isVegan,
      isHalal,
      spicyLevel,
      calories,
      preparationTime,
      stockQuantity,
      isFeatured,
      isBestSeller,
      tags,
    } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({
        message: "Name, price and category are required.",
      });
    }

    const categoryDoc = await CategoryModel.findOne({
      _id: category,
      restaurant: restaurant._id,
    });

    if (!categoryDoc) {
      return res.status(400).json({
        message: "Invalid category for this restaurant.",
      });
    }

    const item = await MenuItemModel.create({
      restaurant: restaurant._id,
      category,
      name,
      description: description || "",
      price,
      originalPrice: originalPrice || 0,
      image: image || "",
      variants: variants || [],
      addons: addons || [],
      isAvailable: isAvailable ?? true,
      isVegetarian: isVegetarian ?? false,
      isVegan: isVegan ?? false,
      isHalal: isHalal ?? false,
      spicyLevel: spicyLevel ?? 0,
      calories: calories ?? 0,
      preparationTime: preparationTime ?? 15,
      stockQuantity: stockQuantity ?? 100,
      isFeatured: isFeatured ?? false,
      isBestSeller: isBestSeller ?? false,
      tags: tags || [],
    });

    res.status(201).json(item);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateMyMenuItem = async (req: any, res: any) => {
  try {
    const item = await MenuItemModel.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const restaurant = await RestaurantModel.findOne({ owner: req.user._id });

    if (item.restaurant.toString() !== restaurant?._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (req.body.category) {
      const categoryDoc = await CategoryModel.findOne({
        _id: req.body.category,
        restaurant: restaurant._id,
      });

      if (!categoryDoc) {
        return res.status(400).json({
          message: "Invalid category for this restaurant.",
        });
      }
    }

    const updatedItem = await MenuItemModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("category");

    res.json(updatedItem);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteMyMenuItem = async (req: any, res: any) => {
  try {
    const item = await MenuItemModel.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const restaurant = await RestaurantModel.findOne({ owner: req.user._id });

    if (item.restaurant.toString() !== restaurant?._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await MenuItemModel.findByIdAndDelete(req.params.id);

    res.json({ message: "Item deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createMyCategory = async (req: any, res: any) => {
  try {
    const restaurant = await RestaurantModel.findOne({ owner: req.user._id });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const { name, description, image, order, isActive } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Category name is required." });
    }

    const category = await CategoryModel.create({
      restaurant: restaurant._id,
      name,
      description: description || "",
      image: image || "",
      order: order ?? 0,
      isActive: isActive ?? true,
    });

    res.status(201).json(category);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateMyCategory = async (req: any, res: any) => {
  try {
    const category = await CategoryModel.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const restaurant = await RestaurantModel.findOne({ owner: req.user._id });

    if (category.restaurant.toString() !== restaurant?._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updated = await CategoryModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteMyCategory = async (req: any, res: any) => {
  try {
    const category = await CategoryModel.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const restaurant = await RestaurantModel.findOne({ owner: req.user._id });

    if (category.restaurant.toString() !== restaurant?._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const itemCount = await MenuItemModel.countDocuments({
      category: category._id,
    });

    if (itemCount > 0) {
      return res.status(400).json({
        message:
          "Cannot delete category because it has menu items. Delete or move menu items first.",
      });
    }

    await CategoryModel.findByIdAndDelete(req.params.id);

    res.json({ message: "Category deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};