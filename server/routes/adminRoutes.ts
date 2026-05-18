import express from "express";
import { protect, admin } from "../middleware/authMiddleware";
import {
  getAdminStats,
  getUsers,
  blockUser,
  getRestaurants,
  createRestaurant,
  updateRestaurant,
  updateRestaurantStatus,
  deleteRestaurant,
  getRiders,
  updateRiderStatus,
  deleteRider,
  getOrders,
  updateOrderStatus,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "../controllers/adminController";

const router = express.Router();

// Categories
router.get("/categories", protect, admin, getCategories);
router.post("/categories", protect, admin, createCategory);
router.put("/categories/:id", protect, admin, updateCategory);
router.delete("/categories/:id", protect, admin, deleteCategory);

// Menu Items
router.get("/menu-items", protect, admin, getMenuItems);
router.post("/menu-items", protect, admin, createMenuItem);
router.put("/menu-items/:id", protect, admin, updateMenuItem);
router.delete("/menu-items/:id", protect, admin, deleteMenuItem);

// Stats
router.get("/stats", protect, admin, getAdminStats);

// Users
router.get("/users", protect, admin, getUsers);
router.patch("/users/:id/block", protect, admin, blockUser);

// Restaurants
router.get("/restaurants", protect, admin, getRestaurants);
router.post("/restaurants", protect, admin, createRestaurant);
router.put("/restaurants/:id", protect, admin, updateRestaurant);
router.patch("/restaurants/:id/status", protect, admin, updateRestaurantStatus);
router.delete("/restaurants/:id", protect, admin, deleteRestaurant);

// Riders
router.get("/riders", protect, admin, getRiders);
router.patch("/riders/:id/status", protect, admin, updateRiderStatus);
router.delete("/riders/:id", protect, admin, deleteRider);

// Orders
router.get("/orders", protect, admin, getOrders);
router.patch("/orders/:id/status", protect, admin, updateOrderStatus);

export default router;