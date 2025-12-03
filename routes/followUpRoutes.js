import express from "express";
import { protect } from "../middlewares/auth.js";
import {
  createFollowUp,
  updateFollowUpStatus,
  getFollowUps,
} from "../controllers/followUpController.js";
import {
  createFollowUpValidator,
  updateFollowUpStatusValidator,
  getFollowUpsValidator
} from "../validators/followUpValidators.js";
import { handleValidation } from "../middlewares/validate.js";

const router = express.Router();

router.post("/", protect, createFollowUpValidator, handleValidation, createFollowUp);
router.get("/", protect, getFollowUpsValidator, handleValidation, getFollowUps);
router.put("/:id/status", protect, updateFollowUpStatusValidator, handleValidation, updateFollowUpStatus);

export default router;
