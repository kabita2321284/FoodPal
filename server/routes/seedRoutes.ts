import express from "express";
import bcrypt from "bcryptjs";

import Restaurant from "../models/Restaurant.js";
import Category from "../models/Category.js";
import MenuItem from "../models/MenuItem.js";
import User from "../models/User.js";

const router = express.Router();

const UserModel = User as any;
const RestaurantModel = Restaurant as any;
const CategoryModel = Category as any;
const MenuItemModel = MenuItem as any;

const buildWeeklyOpeningHours = () => ({
  monday: { isOpen: true, open: "09:00", close: "23:00" },
  tuesday: { isOpen: true, open: "09:00", close: "23:00" },
  wednesday: { isOpen: true, open: "09:00", close: "23:00" },
  thursday: { isOpen: true, open: "09:00", close: "23:00" },
  friday: { isOpen: true, open: "09:00", close: "23:30" },
  saturday: { isOpen: true, open: "09:00", close: "23:30" },
  sunday: { isOpen: true, open: "10:00", close: "22:30" },
});

const upsertUser = async ({
  name,
  email,
  phone,
  role,
}: {
  name: string;
  email: string;
  phone: string;
  role: string;
}) => {
  const existingUser = await UserModel.findOne({ email });

  if (existingUser) {
    existingUser.name = name;
    existingUser.phone = phone;
    existingUser.role = role;
    existingUser.isVerified = true;

    if (role === "RESTAURANT") {
      existingUser.restaurantApplicationStatus = "approved";
    }

    if (role === "RIDER") {
      existingUser.riderApplicationStatus = "approved";
    }

    await existingUser.save();
    return existingUser;
  }

  const hashedPassword = await bcrypt.hash("foodpal123", 10);

  return UserModel.create({
    name,
    email,
    password: hashedPassword,
    phone,
    role,
    isVerified: true,
    restaurantApplicationStatus: role === "RESTAURANT" ? "approved" : "none",
    riderApplicationStatus: role === "RIDER" ? "approved" : "none",
    savedAddresses: [
      {
        label: "Home",
        text: "Kathmandu, Nepal",
        address: "Kathmandu, Nepal",
        lat: 27.7172,
        lng: 85.324,
        isDefault: true,
      },
    ],
  });
};

const upsertRestaurant = async (restaurantData: any) => {
  return RestaurantModel.findOneAndUpdate(
    { name: restaurantData.name },
    restaurantData,
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );
};

const upsertCategory = async (categoryData: any) => {
  return CategoryModel.findOneAndUpdate(
    {
      restaurant: categoryData.restaurant,
      name: categoryData.name,
    },
    categoryData,
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );
};

const upsertMenuItem = async (itemData: any) => {
  return MenuItemModel.findOneAndUpdate(
    {
      restaurant: itemData.restaurant,
      name: itemData.name,
    },
    itemData,
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );
};

const seedDatabase = async (_req: any, res: any) => {
  try {
    const adminUser = await upsertUser({
      name: "FoodPal Admin",
      email: "admin@foodpal.com",
      phone: "9800000000",
      role: "ADMIN",
    });

    const partnerUser = await upsertUser({
      name: "FoodPal Restaurant Partner",
      email: "partner@foodpal.com",
      phone: "9841112233",
      role: "RESTAURANT",
    });

    await upsertUser({
      name: "FoodPal Test Customer",
      email: "customer@foodpal.com",
      phone: "9840000001",
      role: "CUSTOMER",
    });

    await upsertUser({
      name: "FoodPal Test Rider",
      email: "rider@foodpal.com",
      phone: "9840000002",
      role: "RIDER",
    });

    const restaurantsSeed = [
      {
        owner: partnerUser._id,
        name: "Kathmandu Momo House",
        description:
          "Hot steamed momo, jhol momo and spicy Nepali snacks made fresh every day.",
        cuisine: ["Nepali", "Momo", "Newari"],
        tags: ["momo", "nepali", "jhol momo", "buff momo", "chicken momo"],
        images: [
          "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?q=80&w=1200",
        ],
        logo: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?q=80&w=400",
        bannerImage:
          "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?q=80&w=1400",
        address: {
          text: "Durbar Marg, Kathmandu",
          city: "Kathmandu",
          lat: 27.712,
          lng: 85.321,
        },
        location: {
          type: "Point",
          coordinates: [85.321, 27.712],
        },
        rating: 4.8,
        numReviews: 321,
        isOpen: true,
        openingHours: { open: "09:00", close: "23:00" },
        weeklyOpeningHours: buildWeeklyOpeningHours(),
        deliveryFee: 50,
        minimumOrder: 200,
        estimatedDeliveryTime: 28,
        preparationTime: 18,
        averagePrepTime: 18,
        busyPrepTimeExtra: 8,
        isBusy: false,
        priceLevel: "MEDIUM",
        serviceRadiusKm: 15,
        deliverySpeedKmph: 22,
        pickupBufferMinutes: 5,
        isFeatured: true,
        isPromoted: true,
        commissionRate: 15,
        status: "approved",
      },
      {
        owner: partnerUser._id,
        name: "New Road Burger Hub",
        description:
          "Juicy burgers, crispy fried chicken and loaded fries for fast-food lovers.",
        cuisine: ["Burger", "Fast Food", "American"],
        tags: ["burger", "chicken burger", "fries", "fast food"],
        images: [
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1200",
        ],
        logo: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=400",
        bannerImage:
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1400",
        address: {
          text: "New Road, Kathmandu",
          city: "Kathmandu",
          lat: 27.704,
          lng: 85.312,
        },
        location: {
          type: "Point",
          coordinates: [85.312, 27.704],
        },
        rating: 4.6,
        numReviews: 228,
        isOpen: true,
        openingHours: { open: "10:00", close: "23:00" },
        weeklyOpeningHours: buildWeeklyOpeningHours(),
        deliveryFee: 60,
        minimumOrder: 250,
        estimatedDeliveryTime: 32,
        preparationTime: 20,
        averagePrepTime: 20,
        busyPrepTimeExtra: 10,
        isBusy: false,
        priceLevel: "MEDIUM",
        serviceRadiusKm: 15,
        deliverySpeedKmph: 22,
        pickupBufferMinutes: 5,
        isFeatured: true,
        isPromoted: false,
        commissionRate: 15,
        status: "approved",
      },
      {
        owner: partnerUser._id,
        name: "Thamel Pizza Corner",
        description:
          "Freshly baked pizza, garlic bread and cheesy sides delivered hot.",
        cuisine: ["Pizza", "Italian", "Fast Food"],
        tags: ["pizza", "cheese pizza", "pepperoni", "garlic bread"],
        images: [
          "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1200",
        ],
        logo: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=400",
        bannerImage:
          "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1400",
        address: {
          text: "Thamel, Kathmandu",
          city: "Kathmandu",
          lat: 27.715,
          lng: 85.311,
        },
        location: {
          type: "Point",
          coordinates: [85.311, 27.715],
        },
        rating: 4.5,
        numReviews: 176,
        isOpen: true,
        openingHours: { open: "10:00", close: "23:30" },
        weeklyOpeningHours: buildWeeklyOpeningHours(),
        deliveryFee: 70,
        minimumOrder: 300,
        estimatedDeliveryTime: 35,
        preparationTime: 22,
        averagePrepTime: 22,
        busyPrepTimeExtra: 12,
        isBusy: false,
        priceLevel: "MEDIUM",
        serviceRadiusKm: 15,
        deliverySpeedKmph: 22,
        pickupBufferMinutes: 5,
        isFeatured: true,
        isPromoted: true,
        commissionRate: 15,
        status: "approved",
      },
      {
        owner: partnerUser._id,
        name: "Nepali Thali Ghar",
        description:
          "Traditional Nepali thali, dal bhat, curry, achar and homestyle meals.",
        cuisine: ["Nepali", "Thali", "Traditional"],
        tags: ["thali", "dal bhat", "nepali food", "rice", "curry"],
        images: [
          "https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=1200",
        ],
        logo: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=400",
        bannerImage:
          "https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=1400",
        address: {
          text: "Baneshwor, Kathmandu",
          city: "Kathmandu",
          lat: 27.689,
          lng: 85.339,
        },
        location: {
          type: "Point",
          coordinates: [85.339, 27.689],
        },
        rating: 4.7,
        numReviews: 264,
        isOpen: true,
        openingHours: { open: "08:00", close: "22:30" },
        weeklyOpeningHours: buildWeeklyOpeningHours(),
        deliveryFee: 55,
        minimumOrder: 220,
        estimatedDeliveryTime: 30,
        preparationTime: 18,
        averagePrepTime: 18,
        busyPrepTimeExtra: 10,
        isBusy: false,
        priceLevel: "LOW",
        serviceRadiusKm: 15,
        deliverySpeedKmph: 22,
        pickupBufferMinutes: 5,
        isFeatured: true,
        isPromoted: false,
        commissionRate: 15,
        status: "approved",
      },
      {
        owner: partnerUser._id,
        name: "Boudha Khaja Set",
        description:
          "Local khaja set, chowmein, fried rice, sausage and everyday Nepali snacks.",
        cuisine: ["Khaja Set", "Nepali", "Snacks"],
        tags: ["khaja set", "chowmein", "fried rice", "snacks", "sekuwa"],
        images: [
          "https://images.unsplash.com/photo-1559847844-5315695dadae?q=80&w=1200",
        ],
        logo: "https://images.unsplash.com/photo-1559847844-5315695dadae?q=80&w=400",
        bannerImage:
          "https://images.unsplash.com/photo-1559847844-5315695dadae?q=80&w=1400",
        address: {
          text: "Boudha, Kathmandu",
          city: "Kathmandu",
          lat: 27.721,
          lng: 85.362,
        },
        location: {
          type: "Point",
          coordinates: [85.362, 27.721],
        },
        rating: 4.4,
        numReviews: 143,
        isOpen: true,
        openingHours: { open: "09:00", close: "22:00" },
        weeklyOpeningHours: buildWeeklyOpeningHours(),
        deliveryFee: 65,
        minimumOrder: 180,
        estimatedDeliveryTime: 34,
        preparationTime: 20,
        averagePrepTime: 20,
        busyPrepTimeExtra: 10,
        isBusy: false,
        priceLevel: "LOW",
        serviceRadiusKm: 15,
        deliverySpeedKmph: 22,
        pickupBufferMinutes: 5,
        isFeatured: false,
        isPromoted: false,
        commissionRate: 15,
        status: "approved",
      },
      {
        owner: partnerUser._id,
        name: "Patan Sweet Bakery",
        description:
          "Fresh cakes, pastries, sweets, donuts and bakery items for every craving.",
        cuisine: ["Sweets", "Bakery", "Dessert"],
        tags: ["sweets", "cake", "pastry", "bakery", "dessert"],
        images: [
          "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=1200",
        ],
        logo: "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=400",
        bannerImage:
          "https://images.unsplash.com/photo-1488477181946-6428a0291777?q=80&w=1400",
        address: {
          text: "Patan, Lalitpur",
          city: "Kathmandu",
          lat: 27.676,
          lng: 85.314,
        },
        location: {
          type: "Point",
          coordinates: [85.314, 27.676],
        },
        rating: 4.6,
        numReviews: 198,
        isOpen: true,
        openingHours: { open: "08:00", close: "22:00" },
        weeklyOpeningHours: buildWeeklyOpeningHours(),
        deliveryFee: 75,
        minimumOrder: 250,
        estimatedDeliveryTime: 38,
        preparationTime: 15,
        averagePrepTime: 15,
        busyPrepTimeExtra: 8,
        isBusy: false,
        priceLevel: "MEDIUM",
        serviceRadiusKm: 15,
        deliverySpeedKmph: 22,
        pickupBufferMinutes: 5,
        isFeatured: false,
        isPromoted: true,
        commissionRate: 15,
        status: "approved",
      },
    ];

    const createdRestaurants: any[] = [];

    for (const restaurantData of restaurantsSeed) {
      const restaurant = await upsertRestaurant(restaurantData);
      createdRestaurants.push(restaurant);
    }

    const getRestaurant = (name: string) =>
      createdRestaurants.find((restaurant) => restaurant.name === name);

    const momoRestaurant = getRestaurant("Kathmandu Momo House");
    const burgerRestaurant = getRestaurant("New Road Burger Hub");
    const pizzaRestaurant = getRestaurant("Thamel Pizza Corner");
    const thaliRestaurant = getRestaurant("Nepali Thali Ghar");
    const khajaRestaurant = getRestaurant("Boudha Khaja Set");
    const sweetsRestaurant = getRestaurant("Patan Sweet Bakery");

    const momoCategory = await upsertCategory({
      restaurant: momoRestaurant._id,
      name: "Momo",
      description: "Steamed, fried and jhol momo.",
      icon: "🥟",
      isActive: true,
      isFeatured: true,
      order: 1,
      color: "#fb923c",
      tags: ["momo"],
    });

    const burgerCategory = await upsertCategory({
      restaurant: burgerRestaurant._id,
      name: "Burger",
      description: "Classic burgers and fried chicken burgers.",
      icon: "🍔",
      isActive: true,
      isFeatured: true,
      order: 1,
      color: "#60a5fa",
      tags: ["burger"],
    });

    const pizzaCategory = await upsertCategory({
      restaurant: pizzaRestaurant._id,
      name: "Pizza",
      description: "Fresh hot pizza.",
      icon: "🍕",
      isActive: true,
      isFeatured: true,
      order: 1,
      color: "#fca5a5",
      tags: ["pizza"],
    });

    const thaliCategory = await upsertCategory({
      restaurant: thaliRestaurant._id,
      name: "Thali",
      description: "Traditional Nepali thali meals.",
      icon: "🍱",
      isActive: true,
      isFeatured: true,
      order: 1,
      color: "#86efac",
      tags: ["thali"],
    });

    const khajaCategory = await upsertCategory({
      restaurant: khajaRestaurant._id,
      name: "Khaja Set",
      description: "Local khaja sets and snacks.",
      icon: "🍛",
      isActive: true,
      isFeatured: true,
      order: 1,
      color: "#fde68a",
      tags: ["khaja"],
    });

    const sweetsCategory = await upsertCategory({
      restaurant: sweetsRestaurant._id,
      name: "Sweets",
      description: "Sweets, cakes and bakery items.",
      icon: "🍰",
      isActive: true,
      isFeatured: true,
      order: 1,
      color: "#f9a8d4",
      tags: ["sweets"],
    });

    const menuItemsSeed = [
      {
        restaurant: momoRestaurant._id,
        category: momoCategory._id,
        name: "Chicken Steam Momo",
        description: "Freshly steamed chicken momo served with spicy achar.",
        image:
          "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?q=80&w=900",
        price: 220,
        originalPrice: 250,
        isAvailable: true,
        isVegetarian: false,
        isVegan: false,
        isHalal: true,
        spicyLevel: 2,
        calories: 480,
        preparationTime: 15,
        stockQuantity: 100,
        isFeatured: true,
        isBestSeller: true,
        tags: ["momo", "chicken", "nepali"],
        rating: 4.8,
        numReviews: 120,
      },
      {
        restaurant: momoRestaurant._id,
        category: momoCategory._id,
        name: "Buff Jhol Momo",
        description: "Buff momo served in hot and spicy jhol achar.",
        image:
          "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=900",
        price: 260,
        originalPrice: 0,
        isAvailable: true,
        isVegetarian: false,
        isVegan: false,
        isHalal: false,
        spicyLevel: 3,
        calories: 520,
        preparationTime: 18,
        stockQuantity: 100,
        isFeatured: true,
        isBestSeller: true,
        tags: ["jhol momo", "buff momo", "momo"],
        rating: 4.9,
        numReviews: 98,
      },
      {
        restaurant: burgerRestaurant._id,
        category: burgerCategory._id,
        name: "Classic Cheese Burger",
        description: "Juicy patty, melted cheese, lettuce and house sauce.",
        image:
          "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=900",
        price: 350,
        originalPrice: 400,
        isAvailable: true,
        isVegetarian: false,
        isVegan: false,
        isHalal: true,
        spicyLevel: 1,
        calories: 720,
        preparationTime: 18,
        stockQuantity: 100,
        isFeatured: true,
        isBestSeller: true,
        tags: ["burger", "cheese burger"],
        rating: 4.6,
        numReviews: 87,
      },
      {
        restaurant: burgerRestaurant._id,
        category: burgerCategory._id,
        name: "Crunchy Chicken Burger",
        description: "Crispy chicken fillet with mayo, lettuce and fries.",
        image:
          "https://images.unsplash.com/photo-1606755962773-d324e0a13086?q=80&w=900",
        price: 390,
        originalPrice: 0,
        isAvailable: true,
        isVegetarian: false,
        isVegan: false,
        isHalal: true,
        spicyLevel: 2,
        calories: 760,
        preparationTime: 20,
        stockQuantity: 100,
        isFeatured: true,
        isBestSeller: true,
        tags: ["burger", "chicken burger", "fried chicken"],
        rating: 4.7,
        numReviews: 102,
      },
      {
        restaurant: pizzaRestaurant._id,
        category: pizzaCategory._id,
        name: "Margherita Pizza",
        description: "Cheese, tomato sauce and fresh herbs.",
        image:
          "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=900",
        price: 550,
        originalPrice: 650,
        isAvailable: true,
        isVegetarian: true,
        isVegan: false,
        isHalal: true,
        spicyLevel: 0,
        calories: 900,
        preparationTime: 25,
        stockQuantity: 100,
        isFeatured: true,
        isBestSeller: true,
        tags: ["pizza", "cheese pizza"],
        rating: 4.5,
        numReviews: 76,
      },
      {
        restaurant: thaliRestaurant._id,
        category: thaliCategory._id,
        name: "Chicken Nepali Thali",
        description: "Rice, dal, chicken curry, vegetable curry, achar and salad.",
        image:
          "https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=900",
        price: 420,
        originalPrice: 0,
        isAvailable: true,
        isVegetarian: false,
        isVegan: false,
        isHalal: true,
        spicyLevel: 2,
        calories: 850,
        preparationTime: 18,
        stockQuantity: 100,
        isFeatured: true,
        isBestSeller: true,
        tags: ["thali", "dal bhat", "nepali"],
        rating: 4.7,
        numReviews: 89,
      },
      {
        restaurant: khajaRestaurant._id,
        category: khajaCategory._id,
        name: "Special Khaja Set",
        description: "Beaten rice, curry, achar, egg and spicy local sides.",
        image:
          "https://images.unsplash.com/photo-1559847844-5315695dadae?q=80&w=900",
        price: 280,
        originalPrice: 320,
        isAvailable: true,
        isVegetarian: false,
        isVegan: false,
        isHalal: true,
        spicyLevel: 2,
        calories: 680,
        preparationTime: 16,
        stockQuantity: 100,
        isFeatured: true,
        isBestSeller: true,
        tags: ["khaja", "khaja set", "snacks"],
        rating: 4.4,
        numReviews: 54,
      },
      {
        restaurant: sweetsRestaurant._id,
        category: sweetsCategory._id,
        name: "Chocolate Cake Slice",
        description: "Soft chocolate cake slice with creamy frosting.",
        image:
          "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=900",
        price: 180,
        originalPrice: 220,
        isAvailable: true,
        isVegetarian: true,
        isVegan: false,
        isHalal: true,
        spicyLevel: 0,
        calories: 430,
        preparationTime: 8,
        stockQuantity: 100,
        isFeatured: true,
        isBestSeller: true,
        tags: ["cake", "sweet", "dessert"],
        rating: 4.6,
        numReviews: 64,
      },
    ];

    for (const itemData of menuItemsSeed) {
      await upsertMenuItem(itemData);
    }

    const totalRestaurants = await RestaurantModel.countDocuments({
      status: "approved",
    });
    const totalCategories = await CategoryModel.countDocuments({});
    const totalMenuItems = await MenuItemModel.countDocuments({});

    return res.status(200).json({
      success: true,
      message: "FoodPal database seeded successfully. Now refresh the homepage.",
      loginAccounts: {
        admin: {
          email: "admin@foodpal.com",
          password: "foodpal123",
        },
        restaurantPartner: {
          email: "partner@foodpal.com",
          password: "foodpal123",
        },
        customer: {
          email: "customer@foodpal.com",
          password: "foodpal123",
        },
        rider: {
          email: "rider@foodpal.com",
          password: "foodpal123",
        },
      },
      counts: {
        restaurants: totalRestaurants,
        categories: totalCategories,
        menuItems: totalMenuItems,
      },
    });
  } catch (error: any) {
    console.error("Seed error:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Database seed failed",
    });
  }
};

router.get("/", seedDatabase);
router.get("/seed", seedDatabase);

export default router;