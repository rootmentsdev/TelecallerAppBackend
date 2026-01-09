import express from "express";

const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags:
 *       - Health
 *     description: |
 *       Returns the health status of the API server. This endpoint does not require authentication.
 *       Useful for monitoring, load balancers, and deployment health checks.
 *     responses:
 *       200:
 *         description: Server is healthy and running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                   description: Health status indicator
 *                 uptimeSeconds:
 *                   type: number
 *                   example: 12345.67
 *                   description: Server uptime in seconds since process started
 *                 time:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-01-15T10:30:00.000Z"
 *                   description: Current server time in ISO 8601 format
 *             examples:
 *               healthy:
 *                 summary: Healthy server response
 *                 value:
 *                   status: "ok"
 *                   uptimeSeconds: 12345.67
 *                   time: "2025-01-15T10:30:00.000Z"
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptimeSeconds: process.uptime(),
    time: new Date().toISOString(),
  });
});

export default router;
