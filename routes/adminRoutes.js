import express from "express";
import { protect } from "../middlewares/auth.js";
import { requireAdminRole } from "../middlewares/roleMiddleware.js";
import {
    getComplaintPivot,
    getTelecallerSummary,
    getAdminReports
} from "../controllers/adminController.js";

const router = express.Router();

// Apply protection and role check to the entire router or specific routes
// Here we apply to specific routes to be explicit

/**
 * @swagger
 * /api/admin/complaints/pivot:
 *   get:
 *     summary: Get pivot-style analytics for complaints (Admin only)
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Aggregates complaints data based on dynamic grouping.
 *       Default grouping: Store -> SubCategory.
 *       
 *       **Query Params:**
 *       - `groupBy`: Comma-separated fields to group by (e.g., `store,leadType`). 
 *          Allowed: store, leadType, subCategory, itemCategory, callStatus, leadStatus, createdBy, complaintMarkedBy, brand, closingAction.
 *       - `includeTotals`: `true` to return the total count of matching documents.
 *       - **Filtering**: Supports standard store and date filters.
 *         - `store`: "Brand - Location"
 *         - `dateFrom`/`dateTo`: Filters by `complaintMarkedAt` (Work Date).
 *         - `createdAtFrom`/`createdAtTo`: Filters by original lead creation date.
 *     parameters:
 *       - in: query
 *         name: groupBy
 *         type: string
 *         example: "store,subCategory"
 *       - in: query
 *         name: includeTotals
 *         type: boolean
 *       - in: query
 *         name: store
 *         type: string
 *       - in: query
 *         name: dateFrom
 *         type: string
 *         format: date
 *       - in: query
 *         name: dateTo
 *         type: string
 *         format: date
 *     responses:
 *       200:
 *         description: Pivot data retrieved
 *       403:
 *         description: Forbidden (Non-admin)
 */
router.get("/complaints/pivot", protect, requireAdminRole, getComplaintPivot);

/**
 * @swagger
 * /api/admin/telecallers/summary:
 *   get:
 *     summary: Get performance summary for all telecallers (Admin only)
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns aggregated stats (Reports & Complaints) for **each** telecaller.
 *       
 *       **Metrics:**
 *       - Total Reports (Calls made)
 *       - Total Duration
 *       - Total Complaints Marked
 *       - Last Activity Date
 *       
 *       **Filtering:**
 *       - `store`: Filter users/calls by store context (if applicable).
 *       - `dateFrom`/`dateTo`: Filters the **work** (reports/complaints) done within this range.
 *     parameters:
 *       - in: query
 *         name: store
 *         type: string
 *       - in: query
 *         name: dateFrom
 *         type: string
 *         format: date
 *       - in: query
 *         name: dateTo
 *         type: string
 *         format: date
 *     responses:
 *       200:
 *         description: Telecaller summary retrieved
 *       403:
 *         description: Forbidden
 */
router.get("/telecallers/summary", protect, requireAdminRole, getTelecallerSummary);

/**
 * @swagger
 * /api/admin/reports:
 *   get:
 *     summary: Browse all system reports (Admin only)
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Admin view of reports with advanced filtering.
 *       Essentially same as standard reports API but secured for admin dashboard usage.
 *     parameters:
 *       - in: query
 *         name: page
 *         type: integer
 *       - in: query
 *         name: limit
 *         type: integer
 *       - in: query
 *         name: store
 *         type: string
 *       - in: query
 *         name: dateFrom
 *         type: string
 *         format: date
 *       - in: query
 *         name: dateTo
 *         type: string
 *         format: date
 *       - in: query
 *         name: createdBy
 *         type: string
 *         description: Filter by editor ID
 *     responses:
 *       200:
 *         description: List of reports
 *       403:
 *         description: Forbidden
 */
router.get("/reports", protect, requireAdminRole, getAdminReports);

export default router;
