import mongoose from "mongoose";
import Lead from "../../models/Lead.js";
import Store from "../../models/Store.js";
import User from "../../models/User.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// Connect to MongoDB if not already connected
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return; // Already connected
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected for sync");
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

// Save Lead to MongoDB (allows duplicates for customer revisits)
export const saveToMongo = async (leadData) => {
  try {
    await connectDB();

    // Validate required fields
    if (!leadData.name || !leadData.phone || !leadData.store) {
      console.warn("Skipping lead - missing required fields:", leadData);
      return { skipped: true, reason: "Missing required fields" };
    }

    // Create new lead (duplicates allowed for tracking revisits)
    const lead = await Lead.create(leadData);
    return { saved: true, leadId: lead._id, name: lead.name, phone: lead.phone };
  } catch (error) {
    console.error("Error saving lead:", error.message);
    return { error: true, message: error.message };
  }
};

// Save Store to MongoDB (skip duplicates by code or name)
export const saveStoreToMongo = async (storeData) => {
  try {
    await connectDB();

    // Validate required fields
    if (!storeData.name) {
      console.warn("Skipping store - missing name:", storeData);
      return { skipped: true, reason: "Missing name" };
    }

    // Check for duplicate by code or name
    const query = storeData.code 
      ? { $or: [{ code: storeData.code }, { name: storeData.name }] }
      : { name: storeData.name };

    const existing = await Store.findOne(query);
    if (existing) {
      // Update existing store
      const updated = await Store.findByIdAndUpdate(existing._id, storeData, { new: true });
      return { updated: true, storeId: updated._id, name: updated.name };
    }

    // Create new store
    const store = await Store.create(storeData);
    return { saved: true, storeId: store._id, name: store.name };
  } catch (error) {
    console.error("Error saving store:", error.message);
    return { error: true, message: error.message };
  }
};

// Save User to MongoDB (update if employeeId exists, create if new)
export const saveUserToMongo = async (userData) => {
  try {
    await connectDB();

    // Validate required fields
    if (!userData.employeeId || !userData.name || !userData.password || !userData.store) {
      console.warn("Skipping user - missing required fields:", {
        employeeId: userData.employeeId,
        name: userData.name,
        hasPassword: !!userData.password,
        store: userData.store,
      });
      return { skipped: true, reason: "Missing required fields" };
    }

    // Check if user exists by employeeId
    const existing = await User.findOne({ employeeId: userData.employeeId });

    // Hash password if it's plain text (check if already hashed - bcrypt hashes start with $2a$, $2b$, or $2y$)
    let hashedPassword = userData.password;
    if (!userData.password.startsWith("$2")) {
      // Password is plain text, hash it
      hashedPassword = await bcrypt.hash(userData.password, 10);
    }

    const userUpdateData = {
      name: userData.name,
      password: hashedPassword,
      store: userData.store,
      phone: userData.phone || "",
      role: userData.role || "telecaller",
      isActive: userData.isActive !== undefined ? userData.isActive : true,
    };

    if (existing) {
      // Update existing user
      const updated = await User.findByIdAndUpdate(
        existing._id,
        userUpdateData,
        { new: true }
      );
      return { updated: true, userId: updated._id, employeeId: updated.employeeId, name: updated.name };
    } else {
      // Create new user
      const user = await User.create({
        employeeId: userData.employeeId,
        ...userUpdateData,
      });
      return { saved: true, userId: user._id, employeeId: user.employeeId, name: user.name };
    }
  } catch (error) {
    console.error("Error saving user:", error.message);
    return { error: true, message: error.message };
  }
};

