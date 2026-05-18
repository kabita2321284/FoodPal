import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Ensure upload directory exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload only images."), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Single image upload
router.post("/single", protect, upload.single("image"), (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// Multi document upload for riders
router.post("/rider-docs", protect, upload.fields([
  { name: "license", maxCount: 1 },
  { name: "citizenship", maxCount: 1 },
  { name: "profile", maxCount: 1 }
]), (req: any, res: any) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  
  const urls: any = {};
  if (files.license) urls.license = `/uploads/${files.license[0].filename}`;
  if (files.citizenship) urls.citizenship = `/uploads/${files.citizenship[0].filename}`;
  if (files.profile) urls.profile = `/uploads/${files.profile[0].filename}`;

  res.json(urls);
});

export default router;
