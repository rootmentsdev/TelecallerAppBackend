import express from "express";
import { protect } from "../middlewares/auth.js";
import {
  createCallLog,
  getDailySummary,
  getCompletedCalls,
} from "../controllers/callLogController.js";
import {
  createCallLogValidator
} from "../validators/callLogValidators.js";
import { handleValidation } from "../middlewares/validate.js";

const router = express.Router();

router.post("/", protect, createCallLogValidator, handleValidation, createCallLog);
router.get("/daily-summary", protect, getDailySummary);
router.get("/completed", protect, getCompletedCalls);

export default router;
