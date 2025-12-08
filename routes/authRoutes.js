import express from "express";
import { register, login, profile } from "../controllers/authController.js";
import { protect } from "../middlewares/auth.js";
import { registerValidator, loginValidator } from "../validators/authValidators.js";
import { handleValidation } from "../middlewares/validate.js";

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new telecaller
 *     tags:
 *       - Authentication
 *     description: Creates a new telecaller user account. Only creates telecaller role users.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - name
 *               - password
 *               - store
 *               - phone
 *             properties:
 *               employeeId:
 *                 type: string
 *                 example: "Emp001"
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               password:
 *                 type: string
 *                 example: "password123"
 *               store:
 *                 type: string
 *                 example: "Kottayam"
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       201:
 *         description: Telecaller registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Telecaller registered successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     employeeId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     store:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     role:
 *                       type: string
 *                       example: "telecaller"
 *       400:
 *         description: Employee ID already exists or validation error
 *       500:
 *         description: Internal server error
 */
router.post("/register", registerValidator, handleValidation, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login employee and return JWT token
 *     tags:
 *       - Authentication
 *     description: Authenticates an employee using employeeId and password via external API, and returns a JWT token used for accessing protected APIs.
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
 *                 example: "Emp188"
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
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   description: JWT token for authentication
 *                 user:
 *                   type: object
 *                   properties:
 *                     employeeId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     store:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [admin, teamLead, telecaller]
 *       400:
 *         description: Validation error — missing fields.
 *       401:
 *         description: Invalid employeeId or password.
 *       503:
 *         description: Authentication service temporarily unavailable.
 *       500:
 *         description: Internal server error.
 */
router.post("/login", loginValidator, handleValidation, login);

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
 *                 employeeId:
 *                   type: string
 *                 name:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 role:
 *                   type: string
 *                   enum: [admin, teamLead, telecaller]
 *                 store:
 *                   type: string
 *                 isActive:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized — missing or invalid token
 *       500:
 *         description: Internal server error
 */
router.get("/profile", protect, profile);

router.get("/test", (req, res) => {
    res.status(200).json({ message: "Auth route working" });
});

export default router;
