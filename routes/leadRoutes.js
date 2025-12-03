import express from "express";
import { protect } from "../middlewares/auth.js";
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead
} from "../controllers/leadController.js";
import {
  createLeadValidator,
  updateLeadValidator
} from "../validators/leadValidators.js";
import { handleValidation } from "../middlewares/validate.js";

const router = express.Router();

router.post("/", protect, createLeadValidator, handleValidation, createLead);
router.get("/", protect, getLeads);
router.get("/:id", protect, getLeadById);
router.put("/:id", protect, updateLeadValidator, handleValidation, updateLead);
router.delete("/:id", protect, deleteLead);

export default router;
