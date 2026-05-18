import User from "../models/User.js";
import Restaurant from "../models/Restaurant.js";
import Category from "../models/Category.js";
import MenuItem from "../models/MenuItem.js";
import bcrypt from "bcryptjs";

export const seedAdmin = async () => {
  try {
    console.log("Admin Seed: Checking for data...");
    const adminEmail = "admin@foodpal.com";
    const existingAdmin = await (User as any).findOne({ email: adminEmail });

    let admin;
    if (!existingAdmin) {
      console.log("Admin Seed: Creating admin@foodpal.com...");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("admin123", salt);

      admin = await User.create({
        name: "FoodPal Admin",
        email: adminEmail,
        password: hashedPassword,
        phone: "9800000000",
        role: "ADMIN",
        isVerified: true
      });
      console.log("Admin Seed: Admin account created successfully!");
    } else {
      admin = existingAdmin;
      console.log("Admin Seed: Admin account already exists.");
    }

    // Seed restaurants if none exist
    const restaurantCount = await (Restaurant as any).countDocuments();
    if (restaurantCount === 0) {
      console.log("Admin Seed: Seeding initial restaurants...");
      
      const r1 = await (Restaurant as any).create({
        owner: admin._id,
        name: 'Kathmandu Kitchen',
        description: 'Authentic Nepali and Newari cuisine in the heart of the city.',
        cuisine: ['Nepali', 'Newari', 'Traditional'],
        images: ['https://images.unsplash.com/photo-1541167760496-162955ed8a9f?q=80&w=2667'],
        address: { text: 'Durbar Marg, Kathmandu', lat: 27.712, lng: 85.321 },
        location: { type: 'Point', coordinates: [85.321, 27.712] },
        rating: 4.8,
        status: 'approved',
        isFeatured: true
      });

      const r2 = await (Restaurant as any).create({
        owner: admin._id,
        name: 'Burger House & Crunchy Fried Chicken',
        description: 'The best burgers and crispy chicken in town.',
        cuisine: ['American', 'Fast Food', 'Burgers'],
        images: ['https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=1000'],
        address: { text: 'New Road, Kathmandu', lat: 27.704, lng: 85.312 },
        location: { type: 'Point', coordinates: [85.312, 27.704] },
        rating: 4.5,
        status: 'approved',
        isFeatured: false
      });

      const catMomo = await (Category as any).create({ name: 'Momo Specialties', restaurant: r1._id, order: 1 });
      const catBurgers = await (Category as any).create({ name: 'Gourmet Burgers', restaurant: r2._id, order: 1 });

      await (MenuItem as any).create([
        {
          restaurant: r1._id,
          category: catMomo._id,
          name: 'Buff C-Momo',
          description: 'Spicy and tangy chilly momo with hand-minced buff meat.',
          price: 250,
          image: 'https://images.unsplash.com/photo-1534422298391-e4f8c170db06?q=80&w=1000',
          isVeg: false
        },
        {
          restaurant: r2._id,
          category: catBurgers._id,
          name: 'Classic Cheese Burger',
          description: 'Juicy beef patty with melted cheddar, lettuce, and our secret sauce.',
          price: 350,
          image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000',
          isVeg: false
        }
      ]);

      console.log("Admin Seed: Initial restaurants and menu items seeded!");
    }

  } catch (error: any) {
    console.error("Admin Seed Error:", error.message);
  }
};
