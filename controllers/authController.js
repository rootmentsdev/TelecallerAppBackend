import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { postAPI } from "../sync/utils/apiClient.js";

export const register = async (req, res) => {
    try {
        const { employeeId, name, password, store, phone } = req.body;

        const existing = await User.findOne({ employeeId });
        if (existing) {
            return res.status(400).json({ message: "Employee ID already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            employeeId,
            name,
            password: hashedPassword,
            store,
            phone,
            role: "telecaller",
        });

        res.status(201).json({
            message: "Telecaller registered successfully",
            user,
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// List of employeeIds that should be admin (can be changed in code)
// Add or remove employeeIds here to grant/revoke admin access
const ADMIN_EMPLOYEE_IDS = [
    "Emp188",  // SHAFNA ISMAIL - Admin
    "Emp233",  // New Admin
    "Emp345",  // New Admin
    "Emp410",  // New Admin
    "Emp436",  // New Admin
];

// Helper function to check if employeeId should be admin
const isAdminEmployee = (employeeId) => {
    if (!employeeId) return false;
    return ADMIN_EMPLOYEE_IDS.some(
        adminId => adminId.toLowerCase() === employeeId.toLowerCase()
    );
};

// Helper function to map API role to our role system
const mapRoleFromAPI = (apiRole, employeeId) => {
    // First check if this employeeId is designated as admin in code
    if (isAdminEmployee(employeeId)) {
        return "admin";
    }

    if (!apiRole) return "telecaller";

    const roleLower = apiRole.toLowerCase().trim();

    if (roleLower.includes("admin") || roleLower.includes("director") || roleLower.includes("managing")) {
        return "admin";
    } else if (roleLower.includes("lead") || roleLower.includes("team") || roleLower.includes("manager")) {
        return "teamLead";
    } else {
        return "telecaller";
    }
};

export const login = async (req, res) => {
    try {
        const { employeeId, password } = req.body;

        // Validate input
        if (!employeeId || !password) {
            return res.status(400).json({
                message: "Employee ID and Password are required",
                success: false
            });
        }

        // Step 1: ALWAYS verify credentials with external API first
        // This is the ONLY source of truth for authentication
        // Login is ONLY allowed if external API verifies the credentials
        const verifyApiUrl = process.env.VERIFY_EMPLOYEE_API_URL || "https://rootments.in/api/verify_employee";
        const verifyApiToken = process.env.VERIFY_EMPLOYEE_API_TOKEN || "RootX-production-9d17d9485eb772e79df8564004d4a4d4";

        console.log(`🔐 Verifying credentials with external API for: ${employeeId}`);

        // Call external API to verify credentials
        // CRITICAL: Login is ONLY allowed if external API verifies credentials successfully
        const apiResponse = await postAPI(
            verifyApiUrl,
            {
                employeeId: employeeId,
                password: password
            },
            {
                headers: {
                    Authorization: `Bearer ${verifyApiToken}`,
                    "Content-Type": "application/json"
                },
                timeout: 10000 // 10 second timeout
            }
        );

        // Step 2: Check if external API verification failed
        // CRITICAL: If API response is null (network error, timeout, etc.), reject login
        if (!apiResponse) {
            console.log(`❌ External API unavailable or returned null response for: ${employeeId}`);
            return res.status(503).json({
                message: "Unable to verify credentials. Authentication service is temporarily unavailable. Please try again later.",
                success: false,
                error: "External API unavailable"
            });
        }

        // Check if API returned an error status (401/403 from API)
        if (apiResponse.status === "error" || !apiResponse.data) {
            console.log(`❌ External API verification failed for: ${employeeId}`, {
                status: apiResponse.status,
                hasData: !!apiResponse.data
            });
            return res.status(401).json({
                message: "Invalid Employee ID or Password",
                success: false
            });
        }

        // Check if status is not "success"
        if (apiResponse.status !== "success") {
            console.log(`❌ External API verification failed for: ${employeeId}`, {
                status: apiResponse.status
            });
            return res.status(401).json({
                message: "Invalid Employee ID or Password",
                success: false
            });
        }

        // Step 3: External API confirmed credentials are valid
        // Only now can we proceed with login
        console.log(`✅ External API verification successful for: ${employeeId}`);

        const apiUserData = apiResponse.data;

        // Step 4: Map API response to our User model
        // Pass employeeId to mapRoleFromAPI so it can check if user should be admin
        const employeeIdFromAPI = apiUserData.employeeId || apiUserData.employeeld || employeeId;
        const mappedRole = mapRoleFromAPI(apiUserData.role, employeeIdFromAPI);
        const store = apiUserData.Store || apiUserData.store || "No Store";
        const name = apiUserData.name || "";

        // Validate that we have essential data from API
        if (!employeeIdFromAPI || !name) {
            console.error(`⚠️ External API response missing essential data for: ${employeeId}`, apiUserData);
            return res.status(500).json({
                message: "Invalid response from authentication service",
                success: false
            });
        }

        // Step 5: Store or update user in MongoDB with data from external API
        let user = await User.findOne({ employeeId: employeeIdFromAPI });

        if (user) {
            // Update existing user with latest data from external API
            user.name = name;
            user.store = store;
            user.role = mappedRole;
            user.isActive = true;
            // Update password hash (for backup, but we always verify with external API)
            user.password = await bcrypt.hash(password, 10);
            await user.save();
            console.log(`🔄 Updated user in database: ${name} (${employeeIdFromAPI})`);
        } else {
            // Create new user with data from external API
            const hashedPassword = await bcrypt.hash(password, 10);

            user = await User.create({
                employeeId: employeeIdFromAPI,
                name: name,
                password: hashedPassword, // Stored for backup, but external API is always used for verification
                store: store,
                role: mappedRole,
                phone: "",
                isActive: true,
            });
            console.log(`✅ Created new user in database: ${name} (${employeeIdFromAPI})`);
        }

        // Step 6: Generate JWT token (only after external API verification succeeded)
        if (!process.env.JWT_SECRET) {
            console.error("❌ JWT_SECRET is not defined in environment variables");
            return res.status(500).json({
                message: "Server configuration error. Please contact administrator.",
                success: false,
                error: "JWT_SECRET missing"
            });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "7d",
        });

        res.json({
            message: "Login successful",
            success: true,
            token,
            user: {
                employeeId: user.employeeId,
                name: user.name,
                store: user.store,
                phone: user.phone,
                role: user.role,
            },
        });

    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({
            message: "An error occurred during login. Please try again.",
            success: false,
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};

export const profile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
