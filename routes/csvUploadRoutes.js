import express from "express";
import multer from "multer";
import { protect } from "../middlewares/auth.js";
import { allowRoles } from "../middlewares/roles.js";
import { uploadCSV } from "../controllers/csvUploadController.js";

const router = express.Router();

// Configure multer for memory storage (CSV files only)
const storage = multer.memoryStorage();

// File filter to accept CSV and Excel files (same as CLI import scripts)
const fileFilter = (req, file, cb) => {
  const fileName = file.originalname.toLowerCase();
  if (
    file.mimetype === "text/csv" ||
    file.mimetype === "application/vnd.ms-excel" ||
    file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    fileName.endsWith(".csv") ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only CSV and Excel files are allowed"), false);
  }
};

// Configure multer (no file size limit - same as CLI import scripts)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  // No fileSize limit - allow large files like CLI import scripts
});

// Error handler for multer upload errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // File size errors are handled by server defaults now (no limit)
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

/**
 * POST /api/import/csv
 * Upload CSV file and import leads
 * Requires authentication (JWT token)
 * Accepts: multipart/form-data with 'file' and 'leadType' fields
 */
router.post(
  "/csv",
  protect, // JWT authentication required
  allowRoles("admin", "super_admin"), // Only admin or super_admin can upload
  upload.single("file"), // Accept file field named "file"
  handleUploadError,
  uploadCSV
);

export default router;
