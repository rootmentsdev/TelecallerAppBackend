import jwt from "jsonwebtoken";

export const requireAdminAuth = (req, res, next) => {
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const token = authHeader.split(" ")[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check for admin role
        if (decoded.role !== "admin") {
            return res.status(403).json({ message: "Access denied: Admins only" });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};
