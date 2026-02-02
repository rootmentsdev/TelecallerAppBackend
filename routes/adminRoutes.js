import express from "express";
import { protect } from "../middlewares/auth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import {
    getAdminHealth,
    getTelecallerSummary,
    getComplaintPivot,
    getAdminReports
} from "../controllers/adminController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Read-only APIs for Admin Dashboard
 */

/**
 * @swagger
 * /api/admin/health:
 *   get:
 *     summary: Check Admin API health
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin Service Healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 */
router.get("/health", protect, requireAdmin, getAdminHealth);

/**
 * @swagger
 * /api/admin/telecaller-summary:
 *   get:
 *     summary: Get telecaller performance summary (Placeholder)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Returns aggregated performance stats for telecallers.
 *     responses:
 *       200:
 *         description: Summary data
 *       403:
 *         description: Forbidden (Non-admin)
 */
router.get("/telecaller-summary", protect, requireAdmin, getTelecallerSummary);

/**
 * @swagger
 * /api/admin/complaints/pivot:
 *   get:
 *     summary: Get complaints pivot data (Placeholder)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Returns grouped complaint counts.
 *     responses:
 *       200:
 *         description: Pivot data
 *       403:
 *         description: Forbidden
 */
router.get("/complaints/pivot", protect, requireAdmin, getComplaintPivot);

/**
 * @swagger
 * /api/admin/reports:
 *   get:
 *     summary: Get all reports (Admin View - Placeholder)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: Returns paginated list of all reports.
 *     responses:
 *       200:
 *         description: Reports list
 *       403:
 *         description: Forbidden
 */
router.get("/reports", protect, requireAdmin, getAdminReports);

export default router;
