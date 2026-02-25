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
 * @swagger
 * /api/upload/csv:
 *   post:
 *     summary: Upload CSV/Excel file and import leads
 *     tags:
 *       - CSV Upload
 *     security:
 *       - bearerAuth: []
 *     description: "Upload CSV or Excel file and import leads (admin/super_admin only). Lead types walkin, lossofsale. Store from filename, body storeName, or user store."
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, leadType]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: "CSV or Excel file containing lead data"
 *               leadType:
 *                 type: string
 *                 enum: [walkin, lossofsale]
 *                 description: "Type of leads in the file"
 *                 example: "lossofsale"
 *               storeName:
 *                 type: string
 *                 description: "Optional store name. Used if filename extraction fails."
 *                 example: "Suitor Guy - Kannur"
 *     responses:
 *       200:
 *         description: CSV upload and import completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "CSV upload and import completed"
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalRows:
 *                       type: integer
 *                       description: Total number of rows processed
 *                     inserted:
 *                       type: integer
 *                       description: Number of new leads inserted
 *                     updated:
 *                       type: integer
 *                       description: Number of existing leads updated
 *                     skipped:
 *                       type: integer
 *                       description: Number of rows skipped (duplicates or errors)
 *       400:
 *         description: Bad request - File missing, invalid leadType, or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "No CSV file uploaded or invalid leadType (walkin, lossofsale)"
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *       403:
 *         description: Forbidden - Only admin or super_admin can upload CSV files
 *       500:
 *         description: Internal server error
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
