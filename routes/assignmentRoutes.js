import express from "express";
import { protect } from "../middlewares/auth.js";
import { allowRoles } from "../middlewares/roles.js";
import {
  assignSingleLead,
  assignBulkLeads,
} from "../controllers/leadAssignmentController.js";

const router = express.Router();

// Admin & teamLead ONLY
router.post(
  "/single",
  protect,
  allowRoles("admin", "teamLead"),
  assignSingleLead
);

router.post(
  "/bulk",
  protect,
  allowRoles("admin", "teamLead"),
  assignBulkLeads
);

export default router;

