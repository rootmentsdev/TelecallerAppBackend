import express from "express";
import { protect } from "../middlewares/auth.js";
import { allowRoles } from "../middlewares/roles.js";
import {
  assignSingleLead,
  assignBulkLeads,
} from "../controllers/leadAssignmentController.js";

const router = express.Router();

/**
 * @swagger
 * /api/assign/single:
 *   post:
 *     summary: Assign a single lead to a telecaller
 *     tags:
 *       - Lead Assignment
 *     security:
 *       - bearerAuth: []
 *     description: Assigns a single lead to a telecaller. Only admin and teamLead can assign leads.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leadId
 *               - telecallerId
 *             properties:
 *               leadId:
 *                 type: string
 *                 description: The ID of the lead to assign
 *                 example: "507f1f77bcf86cd799439011"
 *               telecallerId:
 *                 type: string
 *                 description: The ID of the telecaller user to assign the lead to
 *                 example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Lead assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Lead assigned successfully"
 *                 lead:
 *                   type: object
 *                   description: The updated lead object
 *       403:
 *         description: Forbidden - Only admin or teamLead can assign leads
 *       404:
 *         description: Lead not found
 *       500:
 *         description: Internal server error
 */
// Admin & teamLead ONLY
router.post(
  "/single",
  protect,
  allowRoles("admin", "teamLead"),
  assignSingleLead
);

/**
 * @swagger
 * /api/assign/bulk:
 *   post:
 *     summary: Assign multiple leads to a telecaller in bulk
 *     tags:
 *       - Lead Assignment
 *     security:
 *       - bearerAuth: []
 *     description: Assigns multiple leads to a telecaller in a single operation. Only admin and teamLead can assign leads.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leadIds
 *               - telecallerId
 *             properties:
 *               leadIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of lead IDs to assign
 *                 example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *               telecallerId:
 *                 type: string
 *                 description: The ID of the telecaller user to assign the leads to
 *                 example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Bulk assignment completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Bulk assignment completed"
 *       403:
 *         description: Forbidden - Only admin or teamLead can assign leads
 *       500:
 *         description: Internal server error
 */
router.post(
  "/bulk",
  protect,
  allowRoles("admin", "teamLead"),
  assignBulkLeads
);

export default router;

