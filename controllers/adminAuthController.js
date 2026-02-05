import jwt from "jsonwebtoken";

// Simple hardcoded admin check for now, can be expanded to DB if needed later
const ADMIN_CREDENTIALS = {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "admin123" // Fallback if env missing
};

export const adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });
        }

        // STRICT equality check
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {

            const token = jwt.sign(
                {
                    role: "admin",
                    type: "admin_access",
                    username: username
                },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            return res.json({
                success: true,
                message: "Admin login successful",
                token,
                user: {
                    username: username,
                    role: "admin"
                }
            });
        }

        return res.status(401).json({
            success: false,
            message: "Invalid admin credentials"
        });

    } catch (error) {
        console.error("Admin Login Error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
