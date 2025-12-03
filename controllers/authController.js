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

// Helper function to map API role to our role system
const mapRoleFromAPI = (apiRole) => {
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
        const verifyApiUrl = process.env.VERIFY_EMPLOYEE_API_URL || "https://rootments.in/api/verify_employee";
        const verifyApiToken = process.env.VERIFY_EMPLOYEE_API_TOKEN || "RootX-production-9d17d9485eb772e79df8564004d4a4d4";

        console.log(`🔐 Verifying credentials with external API for: ${employeeId}`);

        const apiResponse = await postAPI(
            verifyApiUrl,
            {
                employeeId: employeeId,
                password: password
            },
            {
                headers: {
                    Authorization: `Bearer ${verifyApiToken}`
                }
            }
        );

        // Step 2: Check if external API verification failed
        // If API says credentials are invalid, reject login immediately
        if (!apiResponse || apiResponse.status !== "success" || !apiResponse.data) {
            console.log(`❌ External API verification failed for: ${employeeId}`);
            return res.status(401).json({ 
                message: "Invalid Employee ID or Password",
                success: false
            });
        }

        // Step 3: External API confirmed credentials are valid
        // Now we can proceed with login
        console.log(`✅ External API verification successful for: ${employeeId}`);

        const apiUserData = apiResponse.data;

        // Step 4: Map API response to our User model
        const mappedRole = mapRoleFromAPI(apiUserData.role);
        const store = apiUserData.Store || apiUserData.store || "No Store";
        const employeeIdFromAPI = apiUserData.employeeId || apiUserData.employeeld || employeeId; // Handle both spellings
        const name = apiUserData.name || "";

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
            message: error.message || "Login failed",
            success: false
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
