import express from "express";
import multer from "multer";
import { protect } from "../middlewares/auth.js";
import { allowRoles } from "../middlewares/roles.js";
import { uploadCSV } from "../middlewares/upload.js";
import { importLeadsFromCSV } from "../controllers/csvImportController.js";

const router = express.Router();

// Error handler for multer upload errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 10MB",
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload error",
    });
  }
  next();
};

// Admin & teamLead ONLY can upload CSV files
router.post(
  "/leads",
  protect,
  allowRoles("admin", "teamLead"),
  uploadCSV.single("csvFile"),
  handleUploadError,
  importLeadsFromCSV
);

export default router;

