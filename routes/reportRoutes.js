import express from "express";
import { protect } from "../middlewares/auth.js";
import { getReports, getReportById } from "../controllers/reportController.js";
import { getCallStatusSummary } from "../controllers/reportController.js";


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
 *     summary: List report documents (edited leads) with comprehensive filtering
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns reports (edited leads) filtered by optional parameters. Supports the same filtering capabilities as the Leads API.
 *       
 *       **Filtering Options:**
 *       - **Store Filtering**: Supports "Brand - Location" format (e.g., "Suitor Guy - Edappally")
 *       - **Date Filtering**: Filter by original lead creation date OR report edit date
 *       - **Status Filtering**: Filter by callStatus, leadStatus, source
 *       - **Lead Type Filtering**: Filter by leadType (lossOfSale, bookingConfirmation, return, etc.)
 *       - **Editor Filtering**: Filter by who edited the lead
 *       - **Pagination**: Control page size and navigation
 *       
 *       **Key Date Filtering Options:**
 *       - **Original Lead Creation**: `createdAt`, `createdAtFrom`, `createdAtTo` - When the lead was first created
 *       - **Report Edit Date**: `editedAtFrom`, `editedAtTo` - When the lead was edited and moved to reports
 *       - **Legacy Support**: `dateFrom`/`dateTo` and `leadCreatedFrom`/`leadCreatedTo` for backward compatibility
 *       
 *       **Store Filter Examples:**
 *       - Get all reports for a store: `/api/reports?store=Suitor Guy - Edappally`
 *       - Get specific lead type: `/api/reports?leadType=lossOfSale&store=Suitor Guy - Edappally`
 *       
 *       **Date Filter Examples:**
 *       - Filter by lead creation date: `/api/reports?createdAt=2025-12-14`
 *       - Filter by creation date range: `/api/reports?createdAtFrom=2025-01-01&createdAtTo=2025-12-31`
 *       - Filter by edit date range: `/api/reports?editedAtFrom=2025-12-01&editedAtTo=2025-12-31`
 *       
 *       **Combined Filter Examples:**
 *       - Store + Creation Date: `/api/reports?store=Suitor Guy - Edappally&createdAt=2025-12-14`
 *       - Lead Type + Store + Status: `/api/reports?leadType=lossOfSale&store=Suitor Guy - Kottayam&callStatus=Connected`
 *     parameters:
 *       - in: query
 *         name: leadType
 *         schema:
 *           type: string
 *           enum: [lossOfSale, bookingConfirmation, return, justDial, general]
 *         description: Filter by lead type (lossOfSale, bookingConfirmation, return, justDial, general, etc.)
 *       - in: query
 *         name: editedBy
 *         schema:
 *           type: string
 *         description: User id who edited the lead
 *       - in: query
 *         name: store
 *         schema:
 *           type: string
 *           example: "Suitor Guy - Edappally"
 *         description: |
 *           Filter reports by store name using "Brand - Location" format.
 *           
 *           **Supported Formats:**
 *           - **Full Format**: `"Suitor Guy - Edappally"`, `"Zorucci - Kottayam"`
 *           - **Location Only**: `"Edappally"`, `"Kottayam"`, `"Manjeri"`
 *           
 *           **Brand Abbreviations:**
 *           - `"SG"` = `"Suitor Guy"` (e.g., `"SG-Edappally"` matches `"Suitor Guy - Edappally"`)
 *           - `"Z"` = `"Zorucci"` (e.g., `"Z-Kottayam"` matches `"Zorucci - Kottayam"`)
 *           
 *           **Examples:**
 *           - Get all reports for a store: `?store=Suitor Guy - Edappally`
 *           - Get specific lead type: `?leadType=lossOfSale&store=Suitor Guy - Edappally`
 *           - Get all reports for location: `?store=Kottayam`
 *       - in: query
 *         name: callStatus
 *         schema:
 *           type: string
 *         description: Filter by call status (Connected, Not Connected, Call Back Later, etc.)
 *       - in: query
 *         name: leadStatus
 *         schema:
 *           type: string
 *         description: Filter by lead status (Confirmed, Not Confirmed, etc.)
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter by source (Walk-in, Booking, Return, Loss of Sale, etc.)
 *       - in: query
 *         name: createdAt
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-14"
 *         description: |
 *           Filter reports where the original lead was created on a specific date (YYYY-MM-DD).
 *           This is a single date filter (not a range) - perfect for date pickers.
 *           The date is inclusive (includes the entire day from 00:00:00 to 23:59:59).
 *           Takes priority over `createdAtFrom`/`createdAtTo` if provided.
 *           Example: `?createdAt=2025-12-14&store=Suitor Guy - Edappally`
 *       - in: query
 *         name: createdAtFrom
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-01-01"
 *         description: |
 *           Filter reports where the original lead was created on or after this date (YYYY-MM-DD).
 *           Example: `?createdAtFrom=2025-01-01` returns reports for leads created from January 1, 2025 onwards.
 *           Can be combined with `createdAtTo` for a date range.
 *       - in: query
 *         name: createdAtTo
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *         description: |
 *           Filter reports where the original lead was created on or before this date (YYYY-MM-DD).
 *           Example: `?createdAtTo=2025-12-31` returns reports for leads created up to December 31, 2025.
 *           The date is inclusive (includes the entire day up to 23:59:59).
 *           Use with `createdAtFrom` for a date range: `?createdAtFrom=2025-01-01&createdAtTo=2025-12-31`
 *       - in: query
 *         name: editedAtFrom
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-01"
 *         description: |
 *           Filter reports that were edited/moved on or after this date (YYYY-MM-DD).
 *           Example: `?editedAtFrom=2025-12-01` returns reports edited from December 1, 2025 onwards.
 *           Can be combined with `editedAtTo` for a date range.
 *       - in: query
 *         name: editedAtTo
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *         description: |
 *           Filter reports that were edited/moved on or before this date (YYYY-MM-DD).
 *           Example: `?editedAtTo=2025-12-31` returns reports edited up to December 31, 2025.
 *           The date is inclusive (includes the entire day up to 23:59:59).
 *           Use with `editedAtFrom` for a date range: `?editedAtFrom=2025-12-01&editedAtTo=2025-12-31`
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-01-01"
 *         description: |
 *           **Legacy parameter** - Filter reports edited on or after this date (YYYY-MM-DD).
 *           Maps to `editedAtFrom` for backward compatibility.
 *           Use `editedAtFrom` or `createdAtFrom` for clearer intent.
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-12-31"
 *         description: |
 *           **Legacy parameter** - Filter reports edited on or before this date (YYYY-MM-DD).
 *           Maps to `editedAtTo` for backward compatibility.
 *           Use `editedAtTo` or `createdAtTo` for clearer intent.
 *       - in: query
 *         name: leadCreatedFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: |
 *           **Legacy parameter** - Filter by original lead creation date - on or after this date (YYYY-MM-DD).
 *           Maps to `createdAtFrom` for backward compatibility.
 *           Use `createdAtFrom` for clearer intent.
 *       - in: query
 *         name: leadCreatedTo
 *         schema:
 *           type: string
 *           format: date
 *         description: |
 *           **Legacy parameter** - Filter by original lead creation date - on or before this date (YYYY-MM-DD).
 *           Maps to `createdAtTo` for backward compatibility.
 *           Use `createdAtTo` for clearer intent.
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
 *             examples:
 *               storeFiltering:
 *                 summary: Store filtering examples
 *                 value:
 *                   reports: []
 *                   pagination:
 *                     page: 1
 *                     limit: 50
 *                     total: 0
 *                     pages: 0
 *                 description: |
 *                   **Store Filtering Examples:**
 *                   
 *                   1. Get all reports for a store:
 *                      `GET /api/reports?store=Suitor Guy - Edappally`
 *                   
 *                   2. Get Loss of Sale reports for a store:
 *                      `GET /api/reports?leadType=lossOfSale&store=Suitor Guy - Edappally`
 *                   
 *                   3. Get reports for location only:
 *                      `GET /api/reports?store=Kottayam`
 *                   
 *                   4. Get reports with call status:
 *                      `GET /api/reports?store=Suitor Guy - Edappally&callStatus=Connected`
 *               dateFiltering:
 *                 summary: Date filtering examples
 *                 value:
 *                   reports: []
 *                   pagination:
 *                     page: 1
 *                     limit: 50
 *                     total: 0
 *                     pages: 0
 *                 description: |
 *                   **Date Filtering Examples:**
 *                   
 *                   1. Reports for leads created on specific date:
 *                      `GET /api/reports?createdAt=2025-12-14`
 *                   
 *                   2. Reports for leads created in date range:
 *                      `GET /api/reports?createdAtFrom=2025-01-01&createdAtTo=2025-12-31`
 *                   
 *                   3. Reports edited in date range:
 *                      `GET /api/reports?editedAtFrom=2025-12-01&editedAtTo=2025-12-31`
 *                   
 *                   4. Combined store and date filtering:
 *                      `GET /api/reports?store=Suitor Guy - Edappally&createdAt=2025-12-14`
 *               combinedFilters:
 *                 summary: Combined filtering examples
 *                 value:
 *                   reports: []
 *                   pagination:
 *                     page: 1
 *                     limit: 50
 *                     total: 0
 *                     pages: 0
 *                 description: |
 *                   **Combined Filtering Examples:**
 *                   
 *                   1. Store + Lead Type + Creation Date:
 *                      `GET /api/reports?store=Suitor Guy - Edappally&leadType=lossOfSale&createdAt=2025-12-14`
 *                   
 *                   2. Store + Call Status + Date Range:
 *                      `GET /api/reports?store=Suitor Guy - Kottayam&callStatus=Connected&createdAtFrom=2025-01-01&createdAtTo=2025-12-31`
 *                   
 *                   3. Lead Type + Lead Status + Edited Date:
 *                      `GET /api/reports?leadType=bookingConfirmation&leadStatus=Confirmed&editedAtFrom=2025-12-01`
 *                   
 *                   4. Source + Store + Creation Date:
 *                      `GET /api/reports?source=Walk-in&store=Suitor Guy - Manjeri&createdAtFrom=2025-12-01&createdAtTo=2025-12-31`
 */
// Protected: all authenticated users can view reports; further role checks can be added if needed
router.get("/", protect, getReports);

/**
 * @swagger
 * /api/reports/call-summary:
 *   get:
 *     summary: Get call status summary for reports edited/processed on a selected date and store
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns call status summary for reports that were edited/processed on the specified date.
 *       
 *       **Important**: This endpoint uses the **report edit date** (when telecallers processed the leads), 
 *       NOT the original lead creation date. This shows the actual work completed on the specified date.
 *       
 *       **Use Cases:**
 *       - Daily productivity reporting
 *       - Telecaller performance tracking
 *       - Work completion summaries
 *       
 *       **Date Behavior:**
 *       - Shows reports edited/moved on the specified date
 *       - Reflects actual telecaller activity for that day
 *       - More accurate for daily business reporting
 *       
 *       **Examples:**
 *       - Get summary for all stores: `/api/reports/call-summary?date=2025-12-25`
 *       - Get summary for specific store: `/api/reports/call-summary?date=2025-12-25&store=Suitor Guy - Calicut`
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           example: "2025-12-25"
 *         description: |
 *           Date to filter the summary (YYYY-MM-DD format). 
 *           
 *           **Shows call status summary for reports edited/processed on this date.**
 *           
 *           This uses the `editedAt` field (when the report was created/moved), 
 *           NOT the `created_at` field (when the original lead was created).
 *           
 *           Examples:
 *           - `2025-12-25` - Shows work completed on December 25, 2025
 *           - `2025-12-22` - Shows work completed on December 22, 2025
 *       - in: query
 *         name: store
 *         required: false
 *         schema:
 *           type: string
 *           example: "Suitor Guy - Calicut"
 *         description: |
 *           Store name filter (optional). If not provided, results include all stores.
 *           
 *           **Supported Formats:**
 *           - Full store name: `"Suitor Guy - Calicut"`
 *           - Location only: `"Calicut"` (matches all brands in that location)
 *           - Brand only: `"Suitor Guy"` (matches all locations for that brand)
 *     responses:
 *       200:
 *         description: Call status summary fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected:
 *                   type: integer
 *                   example: 21
 *                   description: Number of reports with "Connected" call status
 *                 not_connected:
 *                   type: integer
 *                   example: 9
 *                   description: Number of reports with "Not Connected" call status
 *                 call_back_later:
 *                   type: integer
 *                   example: 2
 *                   description: Number of reports with "Call Back Later" call status
 *                 confirmed:
 *                   type: integer
 *                   example: 3
 *                   description: Number of reports with "Confirmed" call status
 *             examples:
 *               dailySummary:
 *                 summary: Daily work summary example
 *                 value:
 *                   connected: 21
 *                   not_connected: 9
 *                   call_back_later: 2
 *                   confirmed: 3
 *                 description: |
 *                   Example response showing call status summary for work completed on a specific date.
 *                   Total reports processed: 35 (21+9+2+3)
 *       400:
 *         description: Missing or invalid date parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Date is required"
 *       401:
 *         description: Unauthorized – Token missing or invalid
 *       403:
 *         description: Access denied – Telecallers can only see their own reports
 *       500:
 *         description: Internal Server Error
 */
router.get("/call-summary", protect, getCallStatusSummary);

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
