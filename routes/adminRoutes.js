import express from "express";
import { requireAdminAuth } from "../middlewares/adminAuthMiddleware.js";
import {
    getAdminHealth,
    getTelecallerSummary,
    getComplaintPivot,
    getAdminReports,
    getUsers
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
 * /admin/health:
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
router.get("/health", requireAdminAuth, getAdminHealth);

/**
 * @swagger
 * /admin/telecaller-summary:
 *     summary: Get telecaller performance summary (Admin Aggregation)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns aggregated performance stats for all telecallers.
 *       **Read-only admin aggregation. Does not affect telecaller workflows.**
 *       
 *       **Metrics:**
 *       - Total Calls (from Reports)
 *       - Total Duration (from Reports)
 *       - Total Complaints (from Complaints)
 *       
 *       **Filtering:**
 *       - `store`: Filter by store name (e.g. "Edappally")
 *       - `dateFrom`/`dateTo`: Filter by **Work Date** (editedAt / complaintMarkedAt)
 *     parameters:
 *       - in: query
 *         name: store
 *         schema:
 *           type: string
 *         description: Filter by Store Name
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Aggregated data
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 - telecaller:
 *                     id: "65a..."
 *                     name: "John Doe"
 *                     employeeId: "EMP001"
 *                   totalCalls: 45
 *                   totalCallDuration: 3600
 *                   totalComplaints: 2
 *       403:
 *         description: Forbidden (Non-admin)
 */
router.get("/telecaller-summary", requireAdminAuth, getTelecallerSummary);

/**
 * @swagger
 * /admin/complaints/pivot:
 *     summary: Get complaints pivot data (Admin Aggregation)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns grouped complaint counts based on dynamic grouping.
 *       **Read-only aggregation endpoint.**
 *       
 *       **Grouping:**
 *       - `groupBy` (optional): "store", "store,subCategory", "store,leadType", "telecaller", "store,subCategory,telecaller"
 *       - Default: "store,subCategory"
 *
 *       **Filtering:**
 *       - `store`: Filter by store name
 *       - `dateFrom`/`dateTo`: Filter by **Work Date** (complaintMarkedAt)
 *       - `createdAtFrom`/`createdAtTo`: Filter by Lead Creation Date
 *       - `leadType`: Filter by lead type (enquiry, return, etc)
 *       - `subCategory` / `itemCategory`: Text filters
 *       - `telecallerId`: Filter by specific user
 *     parameters:
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *         description: "GroupBy fields (comma separated)"
 *       - in: query
 *         name: store
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *       - in: query
 *         name: leadType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pivot data
 *         content:
 *           application/json:
 *             example:
 *               meta:
 *                 groupBy: "store,subCategory"
 *               rows:
 *                 - store: "Suitor Guy - Edappally"
 *                   subCategory: "Product Issue"
 *                   count: 5
 *                   telecaller: null
 *       403:
 *         description: Forbidden
 */
router.get("/complaints/pivot", requireAdminAuth, getComplaintPivot);

/**
 * @swagger
 * /admin/reports:
 *     summary: Browse all system reports (Admin View)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Admin view of reports with advanced filtering.
 *       **Read-only admin reporting endpoint.**
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
 *         description: "Date From (Work Date/Edited At)"
 *       - in: query
 *         name: dateTo
 *         type: string
 *         format: date
 *         description: "Date To (Work Date/Edited At)"
 *       - in: query
 *         name: createdAtFrom
 *         type: string
 *         format: date
 *         description: "Created At From (Lead Creation)"
 *       - in: query
 *         name: createdAtTo
 *         type: string
 *         format: date
 *         description: "Created At To (Lead Creation)"
 *       - in: query
 *         name: telecallerId
 *         type: string
 *         description: Filter by editor ID (Telecaller)
 *     responses:
 *       200:
 *         description: List of reports
 *         content:
 *           application/json:
 *             example:
 *               meta:
 *                 page: 1
 *                 limit: 50
 *                 total: 1205
 *                 pages: 25
 *               rows:
 *                 - reportId: "65a..."
 *                   leadName: "John Doe"
 *                   phone: "+919876543210"
 *                   store: "Suitor Guy - Edappally"
 *                   callDuration: 120
 *                   leadType: "enquiry"
 *                   callStatus: "ANSWERED"
 *                   createdAt: "2024-01-01T10:00:00Z"
 *                   telecaller:
 *                     id: "user123"
 *                     name: "Caller Name"
 *                     employeeId: "EMP001"
 *       403:
 *         description: Forbidden
 */
router.get("/reports", requireAdminAuth, getAdminReports);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get list of users (Admin View)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by role (e.g. telecaller)
 *     responses:
 *       200:
 *         description: List of users
 */
router.get("/users", requireAdminAuth, getUsers);

export default router;
