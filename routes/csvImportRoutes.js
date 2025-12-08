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

/**
 * @swagger
 * /api/import/leads:
 *   post:
 *     summary: Import leads from CSV file
 *     tags:
 *       - CSV Import
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Uploads and imports leads from a CSV file. Only admin and teamLead can import CSV files.
 *       The CSV file should contain columns for lead data such as name, phone, store, etc.
 *       Maximum file size is 10MB.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - csvFile
 *             properties:
 *               csvFile:
 *                 type: string
 *                 format: binary
 *                 description: CSV file containing lead data
 *     responses:
 *       200:
 *         description: CSV import completed
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
 *                   example: "CSV import completed"
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalRows:
 *                       type: integer
 *                       description: Total number of rows processed
 *                     successful:
 *                       type: integer
 *                       description: Number of successfully imported leads
 *                     failed:
 *                       type: integer
 *                       description: Number of failed imports
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       row:
 *                         type: integer
 *                       success:
 *                         type: boolean
 *                       leadId:
 *                         type: string
 *                       name:
 *                         type: string
 *                       phone:
 *                         type: string
 *                   description: First 100 successful imports
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       row:
 *                         type: integer
 *                       error:
 *                         type: string
 *                       data:
 *                         type: object
 *                   description: First 100 import errors
 *       400:
 *         description: Bad request - File missing, too large, or validation error
 *       403:
 *         description: Forbidden - Only admin or teamLead can import CSV files
 *       500:
 *         description: Internal server error
 */
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

