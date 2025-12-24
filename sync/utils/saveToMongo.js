import mongoose from "mongoose";
import Lead from "../../models/Lead.js";
import Report from "../../models/Report.js";
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

// Bulk save leads to MongoDB for better performance
export const bulkSaveToMongo = async (leadsData) => {
  try {
    await connectDB();

    if (!Array.isArray(leadsData) || leadsData.length === 0) {
      return { saved: 0, skipped: 0, errors: 0 };
    }

    const results = { saved: 0, skipped: 0, errors: 0 };
    const bulkOps = [];
    const skipReasons = [];

    // Process each lead and prepare bulk operations
    for (const leadData of leadsData) {
      // Validate required fields
      if (!leadData.name || !leadData.phone || !leadData.store) {
        results.skipped++;
        skipReasons.push({ phone: leadData.phone, reason: "Missing required fields" });
        continue;
      }

      // Check if lead exists in reports (skip if moved to reports)
      const reportOrClauses = [];
      if ((leadData.leadType === "bookingConfirmation" || leadData.leadType === "return") && leadData.bookingNo && leadData.bookingNo.trim() !== "") {
        const bookingNo = leadData.bookingNo.trim();
        reportOrClauses.push(
          { "beforeSnapshot.phone": leadData.phone, "beforeSnapshot.bookingNo": bookingNo },
          { "leadSnapshot.phone": leadData.phone, "leadSnapshot.bookingNo": bookingNo },
          { "leadData.phone": leadData.phone, "leadData.booking_number": bookingNo },
          { "leadData.phone": leadData.phone, "leadData.bookingNo": bookingNo }
        );
      }
      reportOrClauses.push(
        { "beforeSnapshot.phone": leadData.phone },
        { "leadSnapshot.phone": leadData.phone },
        { "leadData.phone": leadData.phone },
        { "leadData.phone_number": leadData.phone }
      );

      const existingReport = await Report.findOne({ $or: reportOrClauses });
      if (existingReport) {
        results.skipped++;
        skipReasons.push({ phone: leadData.phone, reason: "Lead exists in reports" });
        continue;
      }

      // Prepare duplicate check query
      let duplicateQuery = null;
      if (leadData.leadType === "bookingConfirmation" || leadData.leadType === "return") {
        if (leadData.bookingNo && leadData.bookingNo.trim() !== "") {
          duplicateQuery = {
            bookingNo: leadData.bookingNo.trim(),
            phone: leadData.phone,
            leadType: leadData.leadType,
          };
        } else {
          duplicateQuery = {
            phone: leadData.phone,
            name: leadData.name,
            leadType: leadData.leadType,
            store: leadData.store,
          };
        }

        // For booking/return, skip if exists (don't update)
        const existing = await Lead.findOne(duplicateQuery);
        if (existing) {
          results.skipped++;
          skipReasons.push({ phone: leadData.phone, reason: "Already exists" });
          continue;
        }

        // Add to bulk insert
        bulkOps.push({
          insertOne: {
            document: leadData
          }
        });
      } else {
        // For loss of sale and general, use upsert (update if exists, insert if new)
        if (leadData.leadType === "lossOfSale") {
          duplicateQuery = {
            phone: leadData.phone,
            name: leadData.name,
            leadType: leadData.leadType,
            store: leadData.store,
          };
          if (leadData.enquiryDate) duplicateQuery.enquiryDate = leadData.enquiryDate;
          else if (leadData.visitDate) duplicateQuery.visitDate = leadData.visitDate;
          else if (leadData.functionDate) duplicateQuery.functionDate = leadData.functionDate;
        } else if (leadData.leadType === "general") {
          duplicateQuery = {
            phone: leadData.phone,
            name: leadData.name,
            leadType: leadData.leadType,
            store: leadData.store,
          };
          if (leadData.enquiryDate) duplicateQuery.enquiryDate = leadData.enquiryDate;
          else if (leadData.functionDate) duplicateQuery.functionDate = leadData.functionDate;
        }

        // Add to bulk upsert
        const updateData = { ...leadData };
        delete updateData._id;
        delete updateData.createdAt;

        bulkOps.push({
          updateOne: {
            filter: duplicateQuery,
            update: { $set: updateData },
            upsert: true
          }
        });
      }
    }

    // Execute bulk operations if any
    if (bulkOps.length > 0) {
      const bulkResult = await Lead.bulkWrite(bulkOps, { ordered: false });
      results.saved = bulkResult.insertedCount + bulkResult.upsertedCount;
      results.errors = bulkResult.writeErrors ? bulkResult.writeErrors.length : 0;
    }

    return results;
  } catch (error) {
    console.error("Error in bulk save:", error.message);
    return { saved: 0, skipped: 0, errors: 1, errorMessage: error.message };
  }
};

// Save Lead to MongoDB (prevents duplicates for booking/return, allows for walk-in revisits)
export const saveToMongo = async (leadData) => {
  try {
    await connectDB();

    // Validate required fields
    if (!leadData.name || !leadData.phone || !leadData.store) {
      console.warn("Skipping lead - missing required fields:", leadData);
      return { skipped: true, reason: "Missing required fields" };
    }

    // IMPORTANT: Check if lead already exists in Report collection (moved after edit)
    // New Report schema stores flattened lead in `leadData`. Support both old snapshot fields and new leadData fields.
    const reportOrClauses = [];

    // For booking/return, match by phone + bookingNo for accuracy
    if ((leadData.leadType === "bookingConfirmation" || leadData.leadType === "return") && leadData.bookingNo && leadData.bookingNo.trim() !== "") {
      const bookingNo = leadData.bookingNo.trim();
      reportOrClauses.push(
        { "beforeSnapshot.phone": leadData.phone, "beforeSnapshot.bookingNo": bookingNo },
        { "leadSnapshot.phone": leadData.phone, "leadSnapshot.bookingNo": bookingNo },
        { "leadData.phone": leadData.phone, "leadData.booking_number": bookingNo },
        { "leadData.phone": leadData.phone, "leadData.bookingNo": bookingNo }
      );
    }

    // For all lead types, also check by phone (fallback if bookingNo not available)
    reportOrClauses.push(
      { "beforeSnapshot.phone": leadData.phone },
      { "leadSnapshot.phone": leadData.phone },
      { "leadData.phone": leadData.phone },
      { "leadData.phone_number": leadData.phone }
    );

    const existingReport = await Report.findOne({ $or: reportOrClauses });
    if (existingReport) {
      // Lead was moved to reports - skip importing to prevent it from reappearing in leads list
      return { skipped: true, reason: "Lead exists in reports (moved after edit)" };
    }

    // For booking confirmation and return: check for duplicates and skip (don't update to preserve user edits)
    // These come from API and should only add new records (incremental sync)
    if (leadData.leadType === "bookingConfirmation" || leadData.leadType === "return") {
      let duplicateQuery = null;

      // For booking/return: Primary check: bookingNo + phone + leadType (most reliable)
      if (leadData.bookingNo && leadData.bookingNo.trim() !== "") {
        duplicateQuery = {
          bookingNo: leadData.bookingNo.trim(),
          phone: leadData.phone,
          leadType: leadData.leadType,
        };
      } else {
        // Fallback: phone + name + leadType + store (if bookingNo is missing)
        duplicateQuery = {
          phone: leadData.phone,
          name: leadData.name,
          leadType: leadData.leadType,
          store: leadData.store,
        };
      }

      const existing = await Lead.findOne(duplicateQuery);
      if (existing) {
        // Record already exists - skip it (don't update to preserve user edits and avoid unnecessary updates)
        return { skipped: true, leadId: existing._id, name: existing.name, phone: existing.phone, bookingNo: existing.bookingNo, reason: "Already exists" };
      }
    }

    // For loss of sale and general (walk-in): check for duplicates and UPDATE existing records
    // These come from CSV files and should update existing records when re-imported
    if (leadData.leadType === "lossOfSale" || leadData.leadType === "general") {
      let duplicateQuery = null;

      if (leadData.leadType === "lossOfSale") {
        // For loss of sale: Check phone + name + store + leadType + enquiryDate (if available)
        duplicateQuery = {
          phone: leadData.phone,
          name: leadData.name,
          leadType: leadData.leadType,
          store: leadData.store,
        };

        // If enquiryDate is available, include it in the duplicate check for more accuracy
        if (leadData.enquiryDate) {
          duplicateQuery.enquiryDate = leadData.enquiryDate;
        }
        // If visitDate is available, include it (essential for Loss of Sale visits)
        else if (leadData.visitDate) {
          duplicateQuery.visitDate = leadData.visitDate;
        }
        // Alternative: if functionDate is available and enquiryDate/visitDate are not, use functionDate
        else if (leadData.functionDate) {
          duplicateQuery.functionDate = leadData.functionDate;
        }
      } else if (leadData.leadType === "general") {
        // For general (walk-in): Check phone + name + store + leadType + enquiryDate (if available)
        // This allows same person to have multiple visits, but updates if same date/store
        duplicateQuery = {
          phone: leadData.phone,
          name: leadData.name,
          leadType: leadData.leadType,
          store: leadData.store,
        };

        // If enquiryDate is available, include it to update same-day visits
        if (leadData.enquiryDate) {
          duplicateQuery.enquiryDate = leadData.enquiryDate;
        }
        // Alternative: if functionDate is available and enquiryDate is not, use functionDate
        else if (leadData.functionDate) {
          duplicateQuery.functionDate = leadData.functionDate;
        }
      }

      // Check if lead exists in reports first (before checking Lead collection)
      // Use phone as primary match and support both old and new report shapes
      const reportCheckQuery = {
        $or: [
          { "beforeSnapshot.phone": leadData.phone },
          { "leadSnapshot.phone": leadData.phone },
          { "leadData.phone": leadData.phone },
          { "leadData.phone_number": leadData.phone }
        ]
      };

      const existingReport = await Report.findOne(reportCheckQuery);
      if (existingReport) {
        // Lead was moved to reports - skip importing to prevent it from reappearing in leads list
        return { skipped: true, reason: "Lead exists in reports (moved after edit)" };
      }

      const existing = await Lead.findOne(duplicateQuery);
      if (existing) {
        // Record already exists - UPDATE it with new data (preserves _id and createdAt)
        // Remove _id and createdAt from update data to preserve original values
        const updateData = { ...leadData };
        delete updateData._id;
        delete updateData.createdAt;

        const updated = await Lead.findByIdAndUpdate(
          existing._id,
          { $set: updateData },
          { new: true, runValidators: true }
        );
        return { updated: true, leadId: updated._id, name: updated.name, phone: updated.phone, reason: "Updated existing record" };
      }
    }

    // For other lead types (justDial) or new records: create new lead
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
      // Store already exists - skip it (don't update to avoid unnecessary changes)
      return { skipped: true, storeId: existing._id, name: existing.name, reason: "Already exists" };
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

