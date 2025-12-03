import express from "express";
import { register, login, profile } from "../controllers/authController.js";
import { protect } from "../middlewares/auth.js";
import { registerValidator, loginValidator } from "../validators/authValidators.js";
import { handleValidation } from "../middlewares/validate.js";

const router = express.Router();

router.post("/register", registerValidator, handleValidation, register);
router.post("/login", loginValidator, handleValidation, login);
router.get("/profile", protect, profile);

router.get("/test", (req, res) => {
    res.status(200).json({ message: "Auth route working" });
});

export default router;
