import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "default_secret", {
    expiresIn: "30d",
  });
};

const buildUserResponse = (user: any) => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  language: user.language || 'en',
  avatar: user.avatar,
  savedAddresses: user.savedAddresses || [],
  isVerified: user.isVerified,
  status: user.status,
  riderApplicationStatus: user.riderApplicationStatus,
  restaurantApplicationStatus: user.restaurantApplicationStatus,
  token: generateToken(user._id.toString()),
});

export const register = async (req: any, res: any) => {
  console.log("Auth: Register route hit");

  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "Please provide all required fields: name, email, password.",
    });
  }

  try {
    const normalizedEmail = String(email).toLowerCase().trim();

    const userExists = await (User as any).findOne({ email: normalizedEmail });

    if (userExists) {
      return res.status(400).json({
        message: "Account already exists. Please login.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await (User as any).create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone || "",
      role: "CUSTOMER",
      status: "active",
      isVerified: false,
      riderApplicationStatus: "none",
      restaurantApplicationStatus: "none",
    });

    console.log("Auth: Registration successful for", normalizedEmail);

    return res.status(201).json(buildUserResponse(user));
  } catch (error: any) {
    console.error("Auth: Registration error:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const login = async (req: any, res: any) => {
  console.log("Auth: Login route hit");

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Please provide email and password.",
    });
  }

  try {
    const normalizedEmail = String(email).toLowerCase().trim();

    const user = await (User as any).findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        message: "Your account has been blocked. Please contact support.",
      });
    }

    console.log("Auth: Login successful for", normalizedEmail);

    return res.json(buildUserResponse(user));
  } catch (error: any) {
    console.error("Auth: Login error:", error.message);
    return res.status(500).json({ message: error.message });
  }
};