/**
 * @swagger
 * /api/pages/leads:
 *   get:
 *     summary: Fetch leads with optional filters (leadType, store, etc.)
 *     tags:
 *       - Leads
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns leads filtered by optional parameters. If leadType is not provided, returns leads of all types.
 *       Supports multiple filters including store (brand - location), enquiryDate range, functionDate range, and visitDate range.
 *       Store filter supports both full format (e.g., "Suitor Guy - Kottayam", "Zorucci - Kottayam") and location-only (e.g., "Kottayam", "Edappally").
 *       Examples:
 *       - Get all leads for a store: /api/pages/leads?store=Suitor Guy - Edappally
 *       - Get specific lead type: /api/pages/leads?leadType=bookingConfirmation&store=Zorucci - Kottayam
 *     parameters:
 *       - in: query
 *         name: leadType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [lossOfSale, general, bookingConfirmation, rentOutFeedback, justDial]
 *         description: Type of lead to fetch. If omitted, returns leads of all types.
 *       - in: query
 *         name: store
 *         required: false
 *         schema:
 *           type: string
 *         description: |
 *           Case-insensitive partial match for store. Supports multiple formats:
 *           - Full format: "Suitor Guy - Edappally", "Zorucci - Kottayam"
 *           - Location-only: "Edappally", "Kottayam"
 *           - Brand-only: "Suitor Guy", "Zorucci"
 *           The filter will match both the full format and location part automatically.
 *       - in: query
 *         name: callStatus
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by call status.
 *       - in: query
 *         name: leadStatus
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by lead status.
 *       - in: query
 *         name: source
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter by source (e.g., "Walk-in", "Booking", "Rent-out", "Loss of Sale").
 *       - in: query
 *         name: enquiryDateFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter leads with enquiry date on or after this date (YYYY-MM-DD).
 *       - in: query
 *         name: enquiryDateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter leads with enquiry date on or before this date (YYYY-MM-DD).
 *       - in: query
 *         name: functionDateFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter leads with function date on or after this date (YYYY-MM-DD).
 *       - in: query
 *         name: functionDateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter leads with function date on or before this date (YYYY-MM-DD).
 *       - in: query
 *         name: visitDateFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter leads with visit date on or after this date (YYYY-MM-DD).
 *       - in: query
 *         name: visitDateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter leads with visit date on or before this date (YYYY-MM-DD).
 *       - in: query
 *         name: dateFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Generic date range start (applies to dateField, default: enquiryDate). Use with dateField parameter.
 *       - in: query
 *         name: dateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Generic date range end (applies to dateField, default: enquiryDate). Use with dateField parameter.
 *       - in: query
 *         name: dateField
 *         required: false
 *         schema:
 *           type: string
 *           enum: [enquiryDate, functionDate, visitDate, createdAt]
 *           default: enquiryDate
 *         description: Which date field to use with dateFrom/dateTo (only used if specific date filters not provided).
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (1-indexed).
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of records per page.
 *
 *     responses:
 *       200:
 *         description: Returns a list of leads and pagination info.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 leads:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       lead_name:
 *                         type: string
 *                       phone_number:
 *                         type: string
 *                       store:
 *                         type: string
 *                       lead_type:
 *                         type: string
 *                       call_status:
 *                         type: string
 *                       lead_status:
 *                         type: string
 *                       enquiry_date:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       function_date:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       visit_date:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       booking_number:
 *                         type: string
 *                         nullable: true
 *                       return_date:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       reason_collected_from_store:
 *                         type: string
 *                         nullable: true
 *                       attended_by:
 *                         type: string
 *                         nullable: true
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       assigned_to:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           employee_id:
 *                             type: string
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
 *       401:
 *         description: Unauthorized. Token missing or invalid.
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /api/pages/loss-of-sale/{id}:
 *   get:
 *     summary: Get Loss of Sale lead details
 *     tags:
 *       - Loss of Sale
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the lead
 *     responses:
 *       200:
 *         description: Loss of Sale lead details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lead_name: { type: string }
 *                 phone_number: { type: string }
 *                 visit_date: { type: string, format: date-time }
 *                 function_date: { type: string, format: date-time }
 *                 attended_by: { type: string }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lead not found
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/pages/loss-of-sale/{id}:
 *   post:
 *     summary: Update Loss of Sale lead
 *     tags:
 *       - Loss of Sale
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               call_status: { type: string }
 *               lead_status: { type: string }
 *               follow_up_date: { type: string, format: date-time }
 *               reason_collected_from_store: { type: string }
 *               remarks: { type: string }
 *     responses:
 *       200:
 *         description: Loss of Sale lead updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/pages/rent-out/{id}:
 *   get:
 *     summary: Get Rent-Out lead details
 *     tags:
 *       - Rent Out
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rent-Out lead details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lead_name: { type: string }
 *                 phone_number: { type: string }
 *                 booking_number: { type: string }
 *                 return_date: { type: string, format: date-time }
 *                 attended_by: { type: string }
 *                 security_amount: { type: string }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lead not found
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/pages/rent-out/{id}:
 *   post:
 *     summary: Update Rent-Out lead
 *     tags:
 *       - Rent Out
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               call_status: { type: string }
 *               lead_status: { type: string }
 *               follow_up_flag: { type: boolean }
 *               call_date: { type: string, format: date-time }
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               remarks: { type: string }
 *     responses:
 *       200:
 *         description: Rent-Out lead updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/pages/booking-confirmation/{id}:
 *   get:
 *     summary: Get Booking Confirmation lead
 *     tags:
 *       - Booking Confirmation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking confirmation lead details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lead_name: { type: string }
 *                 phone_number: { type: string }
 *                 enquiry_date: { type: string, format: date-time }
 *                 function_date: { type: string, format: date-time }
 *                 booking_number: { type: string }
 *                 security_amount: { type: string }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lead not found
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/pages/booking-confirmation/{id}:
 *   post:
 *     summary: Update Booking Confirmation lead
 *     tags:
 *       - Booking Confirmation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               call_status: { type: string }
 *               lead_status: { type: string }
 *               follow_up_flag: { type: boolean }
 *               call_date: { type: string, format: date-time }
 *               remarks: { type: string }
 *     responses:
 *       200:
 *         description: Booking Confirmation lead updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/pages/just-dial/{id}:
 *   get:
 *     summary: Get Just Dial lead details
 *     tags:
 *       - Just Dial
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Just Dial lead details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lead_name: { type: string }
 *                 phone_number: { type: string }
 *                 enquiry_date: { type: string, format: date-time }
 *                 function_date: { type: string, format: date-time }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lead not found
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/pages/just-dial/{id}:
 *   post:
 *     summary: Update Just Dial lead
 *     tags:
 *       - Just Dial
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               call_status: { type: string }
 *               lead_status: { type: string }
 *               closing_status: { type: string }
 *               reason: { type: string }
 *               follow_up_flag: { type: boolean }
 *               call_date: { type: string, format: date-time }
 *               remarks: { type: string }
 *     responses:
 *       200:
 *         description: Just Dial lead updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/pages/add-lead:
 *   post:
 *     summary: Create a new lead
 *     tags:
 *       - Add Lead
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customer_name: { type: string }
 *               phone_number: { type: string }
 *               brand: { type: string }
 *               store_location: { type: string }
 *               lead_status: { type: string }
 *               call_status: { type: string }
 *               follow_up_date: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Lead created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only admin or teamLead can add leads
 *       500:
 *         description: Internal server error
 */

import express from "express";
import { protect } from "../middlewares/auth.js";
import { allowRoles } from "../middlewares/roles.js";
import { handleValidation } from "../middlewares/validate.js";
import {
  getLeads,
  getLossOfSaleLead,
  updateLossOfSaleLead,
  getRentOutLead,
  updateRentOutLead,
  getBookingConfirmationLead,
  updateBookingConfirmationLead,
  getJustDialLead,
  updateJustDialLead,
  createAddLead,
  updateGenericLead,
  getLeadById,
} from "../controllers/pageController.js";
import {
  lossOfSaleGetValidator,
  lossOfSalePostValidator,
  rentOutGetValidator,
  rentOutPostValidator,
  bookingConfirmationGetValidator,
  bookingConfirmationPostValidator,
  justDialGetValidator,
  justDialPostValidator,
  addLeadPostValidator,
  leadUpdateValidator,
  leadGetValidator,
  leadsListValidator,
} from "../validators/pageValidators.js";

const router = express.Router();

// ==================== Leads Listing ====================
// GET /api/pages/leads - Fetch list of leads (with filters)
router.get("/leads", protect, leadsListValidator, handleValidation, getLeads);

/**
 * @swagger
 * /api/pages/leads/{id}:
 *   patch:
 *     summary: Generic update for any lead (including 'general') and move it to reports
 *     tags:
 *       - Leads
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead id to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               call_status:
 *                 type: string
 *               lead_status:
 *                 type: string
 *               follow_up_flag:
 *                 type: boolean
 *               follow_up_date:
 *                 type: string
 *                 format: date-time
 *               call_date:
 *                 type: string
 *                 format: date-time
 *               reason_collected_from_store:
 *                 type: string
 *               remarks:
 *                 type: string
 *               closing_status:
 *                 type: string
 *               rating:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Lead updated and moved to reports. Returns created report object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 report:
 *                   type: object
 */
router.patch(
  "/leads/:id",
  protect,
  leadUpdateValidator,
  handleValidation,
  updateGenericLead
);

/**
 * @swagger
 * /api/pages/leads/{id}:
 *   post:
 *     summary: Generic update (POST) for any lead — same behavior as PATCH; moves lead to reports
 *     tags:
 *       - Leads
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead id to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               call_status: { type: string }
 *               lead_status: { type: string }
 *               follow_up_flag: { type: boolean }
 *               follow_up_date: { type: string, format: date-time }
 *               call_date: { type: string, format: date-time }
 *               reason_collected_from_store: { type: string }
 *               remarks: { type: string }
 *               closing_status: { type: string }
 *               rating: { type: integer }
 *     responses:
 *       200:
 *         description: Lead updated and moved to reports
 */
router.post(
  "/leads/:id",
  protect,
  leadUpdateValidator,
  handleValidation,
  updateGenericLead
);

/**
 * @swagger
 * /api/pages/leads/{id}:
 *   get:
 *     summary: Fetch any lead by id (no leadType required)
 *     tags:
 *       - Leads
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead id to fetch
 *     responses:
 *       200:
 *         description: Lead object in listing format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get(
  "/leads/:id",
  protect,
  leadGetValidator,
  handleValidation,
  getLeadById
);

// ==================== Loss of Sale Page Routes ====================
// GET /api/pages/loss-of-sale/:id - Fetch Loss of Sale lead data
router.get(
  "/loss-of-sale/:id",
  protect,
  lossOfSaleGetValidator,
  handleValidation,
  getLossOfSaleLead
);

// POST /api/pages/loss-of-sale/:id - Update Loss of Sale lead data
router.post(
  "/loss-of-sale/:id",
  protect,
  lossOfSalePostValidator,
  handleValidation,
  updateLossOfSaleLead
);

// ==================== Rent-Out Page Routes ====================
// GET /api/pages/rent-out/:id - Fetch Rent-Out lead data
router.get(
  "/rent-out/:id",
  protect,
  rentOutGetValidator,
  handleValidation,
  getRentOutLead
);

// POST /api/pages/rent-out/:id - Update Rent-Out lead data
router.post(
  "/rent-out/:id",
  protect,
  rentOutPostValidator,
  handleValidation,
  updateRentOutLead
);

// ==================== Booking Confirmation Page Routes ====================
// GET /api/pages/booking-confirmation/:id - Fetch Booking Confirmation lead data
router.get(
  "/booking-confirmation/:id",
  protect,
  bookingConfirmationGetValidator,
  handleValidation,
  getBookingConfirmationLead
);

// POST /api/pages/booking-confirmation/:id - Update Booking Confirmation lead data
router.post(
  "/booking-confirmation/:id",
  protect,
  bookingConfirmationPostValidator,
  handleValidation,
  updateBookingConfirmationLead
);

// ==================== Just Dial Page Routes ====================
// GET /api/pages/just-dial/:id - Fetch Just Dial lead data
router.get(
  "/just-dial/:id",
  protect,
  justDialGetValidator,
  handleValidation,
  getJustDialLead
);

// POST /api/pages/just-dial/:id - Update Just Dial lead data
router.post(
  "/just-dial/:id",
  protect,
  justDialPostValidator,
  handleValidation,
  updateJustDialLead
);

// ==================== Add Lead Page Routes ====================
// POST /api/pages/add-lead - Create new lead (Admin/Team Lead only)
router.post(
  "/add-lead",
  protect,
  allowRoles("admin", "teamLead"),
  addLeadPostValidator,
  handleValidation,
  createAddLead
);

// Simple test route (for Swagger sanity check)
router.get("/test", (req, res) => {
  res.json({ message: "Swagger is working!" });
});

export default router;
