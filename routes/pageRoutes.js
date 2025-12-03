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

export default router;

