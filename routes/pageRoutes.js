/**
 * @swagger
 * /api/pages/leads:
 *   get:
 *     summary: Fetch leads based on leadType and filters
 *     tags:
 *       - Leads
 *     description: |
 *       Returns leads for Loss of Sale, Walk-in, Booking Confirmation, or Rent-Out Feedback.
 *       Supports multiple filters including store, enquiryDate range, functionDate range, and visitDate range.
 *     parameters:
 *       - in: query
 *         name: leadType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [lossOfSale, general, bookingConfirmation, rentOutFeedback]
 *         description: Type of lead to fetch.
 *
 *       - in: query
 *         name: store
 *         required: false
 *         schema:
 *           type: string
 *         description: Store name (e.g., "Zurocci - Edappal").
 *
 *       - in: query
 *         name: enquiryDateFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Starting date for enquiry date filter.
 *
 *       - in: query
 *         name: enquiryDateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Ending date for enquiry date filter.
 *
 *       - in: query
 *         name: functionDateFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Starting date for function date filter.
 *
 *       - in: query
 *         name: functionDateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Ending date for function date filter.
 *
 *       - in: query
 *         name: visitDateFrom
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Starting date for visit date filter.
 *
 *       - in: query
 *         name: visitDateTo
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Ending date for visit date filter.
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
 *                       _id:
 *                         type: string
 *                       customerName:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       leadType:
 *                         type: string
 *                       store:
 *                         type: string
 *                       enquiryDate:
 *                         type: string
 *                         format: date
 *                       functionDate:
 *                         type: string
 *                         format: date
 *                       visitDate:
 *                         type: string
 *                         format: date
 *                       status:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     total:
 *                       type: number
 *                     pages:
 *                       type: number
 *
 *       401:
 *         description: Unauthorized. Token missing or invalid.
 *
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
 *         description: Loss of Sale lead details fetched successfully
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
 *             description: Payload depends on validator
 *     responses:
 *       200:
 *         description: Loss of Sale updated successfully
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
 *         description: Rent-Out lead fetched successfully
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
 *         description: Booking confirmation lead fetched
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
 *             description: Lead creation payload
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
/**
 * /**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login employee and return JWT token
 *     tags:
 *       - Authentication
 *     description: Authenticates an employee using employeeId and password, and returns a JWT token used for accessing protected APIs.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - password
 *             properties:
 *               employeeId:
 *                 type: string
 *                 example: "EMP12345"
 *               password:
 *                 type: string
 *                 example: "mypassword123"
 *     responses:
 *       200:
 *         description: Login successful — JWT token and employee details returned.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     employeeId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                     store:
 *                       type: string
 *       400:
 *         description: Validation error — missing fields.
 *       401:
 *         description: Invalid employeeId or password.
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get logged-in user profile
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     description: Returns user details extracted from JWT token.
 *     responses:
 *       200:
 *         description: User profile fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 role:
 *                   type: string
 *                 store:
 *                   type: string
 *       401:
 *         description: Unauthorized — missing or invalid token
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
} from "../validators/pageValidators.js";

const router = express.Router();

// ==================== Leads Listing ====================
// GET /api/pages/leads - Fetch list of leads (with filters)
router.get("/leads", protect, getLeads);

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

router.get('/test', (req, res) => {
  res.json({ message: "Swagger is working!" });
});

export default router;

