import express from "express";
import { protect } from "../middlewares/auth.js";
import { getReports, getReportById } from "../controllers/reportController.js";

const router = express.Router();

/**
 *     Report:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         leadData:
 *           type: object
 *           description: Flattened lead data as returned by the leads list API (lead_name, phone_number, store, lead_type, etc.)
 *         editedBy:
 *           type: object
 *         editedAt:
 *           type: string
 *           format: date-time
 *         note:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: List report documents (edited leads)
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: leadType
 *         schema:
 *           type: string
 *         description: Filter by lead type (lossOfSale, bookingConfirmation, rentOutFeedback, justDial, etc.)
 *       - in: query
 *         name: editedBy
 *         schema:
 *           type: string
 *         description: User id who edited the lead
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter reports edited on or after this date (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter reports edited on or before this date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: A paginated list of reports
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reports:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Report'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
// Protected: all authenticated users can view reports; further role checks can be added if needed
router.get("/", protect, getReports);

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Get a single report by id
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report id
 *     responses:
 *       200:
 *         description: Report found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Report'
 *       404:
 *         description: Report not found
 */
router.get("/:id", protect, getReportById);

export default router;
