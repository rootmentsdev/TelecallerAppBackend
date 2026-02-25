import mongoose from "mongoose";
import Lead from "../../models/Lead.js";
import FollowUp from "../../models/FollowUp.js";
import Report from "../../models/Report.js";
import Store from "../../models/Store.js";
import User from "../../models/User.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// Helper function to normalize fields for duplicate checking
// CRITICAL: This ensures consistent duplicate detection across all lead types
const normalizeForDuplicateCheck = (leadData) => {
  return {
    name: (leadData.name || "").trim(),
    phone: (leadData.phone || "").trim(),
    store: (leadData.store || "").trim(),
    bookingNo: leadData.bookingNo ? leadData.bookingNo.trim() : "",
  };
};

// Helper function to build case-insensitive query for name and store
const buildCaseInsensitiveQuery = (normalized, leadType, bookingNo = "") => {
  const escapeRegex = (s) => (s || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const query = {
    name: { $regex: new RegExp(`^${escapeRegex(normalized.name)}$`, 'i') },
    phone: normalized.phone,
    leadType: leadType,
    store: { $regex: new RegExp(`^${escapeRegex(normalized.store)}$`, 'i') },
  };

  if (bookingNo !== "") {
    query.bookingNo = bookingNo;
  }

  return query;
};

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

      // Normalize fields for consistent checking
      const normalized = normalizeForDuplicateCheck(leadData);

      // Check if lead exists in reports or follow-ups (skip if moved)
      const reportOrClauses = [];
      if ((leadData.leadType === "booked" || leadData.leadType === "return" || leadData.leadType === "bookingconfirmation") && normalized.bookingNo !== "") {
        reportOrClauses.push(
          { "beforeSnapshot.phone": normalized.phone, "beforeSnapshot.bookingNo": normalized.bookingNo },
          { "leadSnapshot.phone": normalized.phone, "leadSnapshot.bookingNo": normalized.bookingNo },
          { "leadData.phone": normalized.phone, "leadData.booking_number": normalized.bookingNo },
          { "leadData.phone": normalized.phone, "leadData.bookingNo": normalized.bookingNo }
        );
      }
      reportOrClauses.push(
        { "beforeSnapshot.phone": normalized.phone },
        { "leadSnapshot.phone": normalized.phone },
        { "leadData.phone": normalized.phone },
        { "leadData.phone_number": normalized.phone }
      );

      const existingReport = await Report.findOne({ $or: reportOrClauses });
      if (existingReport) {
        results.skipped++;
        skipReasons.push({ phone: normalized.phone, reason: "Lead exists in reports" });
        continue;
      }

      // Also check FollowUps collection - use normalized fields
      const followUpQuery = { phone: normalized.phone };
      if ((leadData.leadType === "booked" || leadData.leadType === "return" || leadData.leadType === "bookingconfirmation") && normalized.bookingNo !== "") {
        followUpQuery.bookingNo = normalized.bookingNo;
        followUpQuery.leadType = leadData.leadType;
      } else {
        followUpQuery.name = normalized.name;
        followUpQuery.leadType = leadData.leadType;
        followUpQuery.store = normalized.store;
      }
      const existingFollowUp = await FollowUp.findOne(followUpQuery);
      if (existingFollowUp) {
        results.skipped++;
        skipReasons.push({ phone: normalized.phone, reason: "Lead exists in follow-ups" });
        continue;
      }

      // DUPLICATE CHECK: For ALL lead types, check: name, phone, leadType, store
      // This ensures no duplicates are created during bulk sync
      // CRITICAL: Normalize and trim all fields for accurate comparison
      const normalizedName = (leadData.name || "").trim();
      const normalizedPhone = (leadData.phone || "").trim();
      const normalizedStore = (leadData.store || "").trim();
      const normalizedBookingNo = leadData.bookingNo ? leadData.bookingNo.trim() : "";

      // Build duplicate check query with normalized fields
      const duplicateQuery = {
        name: normalizedName,
        phone: normalizedPhone,
        leadType: leadData.leadType,
        store: normalizedStore,
      };

      // Add bookingNo (id) if it exists - this is critical for booking/return leads
      // CRITICAL: Re-enabled to allow multiple returns/bookings for same customer
      if (normalizedBookingNo !== "") {
        duplicateQuery.bookingNo = normalizedBookingNo;
      }

      // Use case-insensitive comparison for name and store to catch case differences
      // Use case-insensitive comparison for name and store to catch case differences
      const caseInsensitiveQuery = {
        name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        phone: normalizedPhone,
        leadType: leadData.leadType,
        store: { $regex: new RegExp(`^${normalizedStore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      };

      if (normalizedBookingNo !== "") {
        caseInsensitiveQuery.bookingNo = normalizedBookingNo;
      }

      // Try exact match first (faster)
      let existing = await Lead.findOne(duplicateQuery);

      // If not found, try case-insensitive match (catches case differences)
      // CRITICAL: This catches duplicates with different casing (e.g., "SHEHIR" vs "shehir")
      if (!existing && normalizedName && normalizedStore) {
        existing = await Lead.findOne(caseInsensitiveQuery);
        if (existing) {
          console.log(`   ⚠️  Case-insensitive duplicate detected: name="${existing.name}" vs "${normalizedName}", store="${existing.store}" vs "${normalizedStore}"`);
        }
      }
      if (existing) {
        // Record already exists - skip it to prevent duplicates
        results.skipped++;
        const checkFields = `name="${normalizedName}", phone="${normalizedPhone}", leadType="${leadData.leadType}", store="${normalizedStore}"`;
        skipReasons.push({
          phone: normalizedPhone,
          name: normalizedName,
          reason: `Duplicate detected: matching ${checkFields}`
        });
        continue;
      }

      // For booking/return: add to bulk insert (don't update to preserve user edits)
      if (leadData.leadType === "booked" || leadData.leadType === "return" || leadData.leadType === "bookingconfirmation") {
        // Add to bulk insert - ensure remarks is included
        const document = { ...leadData };
        if (leadData.hasOwnProperty('remarks')) {
          document.remarks = leadData.remarks ?? null;
        }
        bulkOps.push({
          insertOne: {
            document: document
          }
        });
      } else {
        // For loss of sale and general, use upsert (update if exists, insert if new)
        // CRITICAL: Use normalized fields for consistent duplicate detection
        const normalized = normalizeForDuplicateCheck(leadData);

        // Build duplicate query with normalized fields and case-insensitive matching
        const duplicateQuery = buildCaseInsensitiveQuery(normalized, leadData.leadType);

        // Add date fields if available (for more precise matching)
        if (leadData.leadType === "lossOfSale") {
          if (leadData.enquiryDate) duplicateQuery.enquiryDate = leadData.enquiryDate;
          else if (leadData.visitDate) duplicateQuery.visitDate = leadData.visitDate;
          else if (leadData.functionDate) duplicateQuery.functionDate = leadData.functionDate;
        } else if (leadData.leadType === "enquiry") {
          if (leadData.enquiryDate) duplicateQuery.enquiryDate = leadData.enquiryDate;
          else if (leadData.functionDate) duplicateQuery.functionDate = leadData.functionDate;
        }

        // Add to bulk upsert - ensure remarks is included
        const updateData = { ...leadData };
        delete updateData._id;
        delete updateData.createdAt;
        // Explicitly include remarks field (string or null)
        if (leadData.hasOwnProperty('remarks')) {
          updateData.remarks = leadData.remarks ?? null;
        }

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
      try {
        const bulkResult = await Lead.bulkWrite(bulkOps, { ordered: false });
        results.saved = bulkResult.insertedCount + bulkResult.upsertedCount;

        // Handle write errors (including duplicate key errors E11000)
        if (bulkResult.writeErrors && bulkResult.writeErrors.length > 0) {
          let duplicateKeyErrors = 0;
          for (const writeError of bulkResult.writeErrors) {
            // E11000 is duplicate key error from unique index
            if (writeError.code === 11000) {
              duplicateKeyErrors++;
              console.log(`   ⚠️  Duplicate detected by unique index: ${writeError.errmsg || 'duplicate key'}`);
            } else {
              results.errors++;
              console.error(`   ❌ Bulk write error: ${writeError.errmsg || 'unknown error'}`);
            }
          }
          // Treat duplicate key errors as skipped, not errors
          results.skipped += duplicateKeyErrors;
        }
      } catch (bulkError) {
        // Handle bulk write errors
        if (bulkError.code === 11000 || (bulkError.name === 'MongoServerError' && bulkError.code === 11000)) {
          // Duplicate detected by unique index - treat as skipped
          console.log(`   ⚠️  Duplicate detected by unique index in bulk operation`);
          results.skipped++;
        } else {
          console.error("Error in bulk save:", bulkError.message);
          results.errors++;
        }
      }
    }

    return results;
  } catch (error) {
    // Handle duplicate key errors gracefully (E11000)
    if (error.code === 11000 || (error.name === 'MongoServerError' && error.code === 11000)) {
      console.log(`   ⚠️  Duplicate detected by unique index`);
      return { saved: 0, skipped: 1, errors: 0, errorMessage: "Duplicate detected by unique index" };
    }
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

    // Normalize fields for consistent checking
    const normalized = normalizeForDuplicateCheck(leadData);

    // IMPORTANT: Check if lead already exists in Report or FollowUp collection (moved after edit)
    // New Report schema stores flattened lead in `leadData`. Support both old snapshot fields and new leadData fields.
    const reportOrClauses = [];

    // For booking/return, match by phone + bookingNo for accuracy
    if ((leadData.leadType === "booked" || leadData.leadType === "return" || leadData.leadType === "bookingconfirmation") && normalized.bookingNo !== "") {
      reportOrClauses.push(
        { "beforeSnapshot.phone": normalized.phone, "beforeSnapshot.bookingNo": normalized.bookingNo },
        { "leadSnapshot.phone": normalized.phone, "leadSnapshot.bookingNo": normalized.bookingNo },
        { "leadData.phone": normalized.phone, "leadData.booking_number": normalized.bookingNo },
        { "leadData.phone": normalized.phone, "leadData.bookingNo": normalized.bookingNo }
      );
    }

    // For all lead types, also check by phone (fallback if bookingNo not available)
    reportOrClauses.push(
      { "beforeSnapshot.phone": normalized.phone },
      { "leadSnapshot.phone": normalized.phone },
      { "leadData.phone": normalized.phone },
      { "leadData.phone_number": normalized.phone }
    );

    const existingReport = await Report.findOne({ $or: reportOrClauses });
    if (existingReport) {
      // Lead was moved to reports - skip importing to prevent it from reappearing in leads list
      return { skipped: true, reason: "Lead exists in reports (moved after edit)" };
    }

    // Also check FollowUps collection - use normalized fields
    const followUpQuery = { phone: normalized.phone };
    if ((leadData.leadType === "booked" || leadData.leadType === "return" || leadData.leadType === "bookingconfirmation") && normalized.bookingNo !== "") {
      followUpQuery.bookingNo = normalized.bookingNo;
      followUpQuery.leadType = leadData.leadType;
    } else {
      followUpQuery.name = normalized.name;
      followUpQuery.leadType = leadData.leadType;
      followUpQuery.store = normalized.store;
    }
    const existingFollowUp = await FollowUp.findOne(followUpQuery);
    if (existingFollowUp) {
      // Lead was moved to follow-ups - skip importing to prevent it from reappearing in leads list
      return { skipped: true, reason: "Lead exists in follow-ups (moved after edit)" };
    }

    // DUPLICATE CHECK FOR BOOKING/RETURN/BOOKINGCONFIRMATION: Skip if duplicate (don't update to preserve user edits)
    // leadType is always part of the query: "booked" (manual) and "bookingconfirmation" (API) stay separate.
    // ALWAYS check: name, phone, leadType, store, brand
    if (leadData.leadType === "booked" || leadData.leadType === "return" || leadData.leadType === "bookingconfirmation") {
      // Normalize fields: trim and ensure consistent format
      const normalizedName = (leadData.name || "").trim();
      const normalizedPhone = (leadData.phone || "").trim();
      const normalizedStore = (leadData.store || "").trim();
      const normalizedBookingNo = leadData.bookingNo ? leadData.bookingNo.trim() : "";

      // Safety Validation: Brand is required for uniqueness
      if (!normalizedBrand && (leadData.leadType === "return" || leadData.leadType === "bookingconfirmation")) {
        console.warn(`⚠️  Skipping return lead - missing brand (Identity Risk): ${normalizedStore}`);
        return { skipped: true, reason: "Missing brand identity" };
      }

      // Build comprehensive duplicate check query with normalized fields (identity: brand + store + bookingNo or phone)
      const duplicateQuery = {
        name: normalizedName,
        phone: normalizedPhone,
        leadType: leadData.leadType,
        store: normalizedStore,
      };

      // Add bookingNo (id) if it exists - this is critical for booking/return leads
      // CRITICAL: Re-enabled to allow multiple returns/bookings for same customer (repeat business)
      if (normalizedBookingNo !== "") {
        duplicateQuery.bookingNo = normalizedBookingNo;
      }

      // Use case-insensitive comparison for name and store to catch case differences
      const caseInsensitiveQuery = {
        name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        phone: normalizedPhone,
        leadType: leadData.leadType,
        store: { $regex: new RegExp(`^${normalizedStore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      };

      if (normalizedBookingNo !== "") {
        caseInsensitiveQuery.bookingNo = normalizedBookingNo;
      }

      // Try exact match first (faster)
      let existing = await Lead.findOne(duplicateQuery);

      // If not found, try case-insensitive match (catches case differences)
      if (!existing && normalizedName && normalizedStore) {
        existing = await Lead.findOne(caseInsensitiveQuery);
      }

      // CRITICAL: Secondary Check - Check by Name + Phone + LeadType + Store (IGNORING bookingNo)
      // This handles cases where the booking number is missing but it is logically the same lead.
      // We ONLY do this check if we don't have a booking number to differentiate.
      if (!existing && normalizedBookingNo === "") {
        const secondaryQuery = {
          name: { $regex: new RegExp(`^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          phone: normalizedPhone,
          leadType: leadData.leadType,
          store: { $regex: new RegExp(`^${normalizedStore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          // Do NOT include bookingNo
        };
        existing = await Lead.findOne(secondaryQuery);
        if (existing) {
          console.log(`   ⚠️  Duplicate detected by Secondary Check (Name+Phone+Type+Store) - BookingNo missing in incoming:`);
          console.log(`      Existing BookingNo: ${existing.bookingNo}`);
        }
      }

      if (existing) {
        // Record already exists in Leads - skip it to prevent duplicates
        const checkFields = `name="${normalizedName}", phone="${normalizedPhone}", leadType="${leadData.leadType}", store="${normalizedStore}"${normalizedBookingNo ? `, bookingNo="${normalizedBookingNo}"` : ""}`;
        console.log(`   ⏭️  Duplicate detected in Leads - skipped: ${checkFields}`);
        console.log(`      Existing lead ID: ${existing._id}`);
        return {
          skipped: true,
          leadId: existing._id,
          name: existing.name,
          phone: existing.phone,
          bookingNo: existing.bookingNo,
          reason: "Duplicate detected in Leads collection: matching " + checkFields
        };
      }
    }

    // DUPLICATE CHECK FOR LOSS OF SALE/ENQUIRY: Update if duplicate (upsert)
    // These come from CSV files and should update existing records when re-imported
    // ALWAYS check: name, phone, leadType, store (same base criteria as booking/return)
    // CRITICAL: Normalize and use case-insensitive matching for consistent duplicate detection
    if (leadData.leadType === "lossOfSale" || leadData.leadType === "enquiry") {
      // Normalize fields: trim and ensure consistent format (same as booking/return)
      const normalized = normalizeForDuplicateCheck(leadData);

      // Build duplicate check query with normalized fields and case-insensitive matching
      const duplicateQuery = buildCaseInsensitiveQuery(normalized, leadData.leadType);

      // Add date fields if available (for more precise matching)
      if (leadData.leadType === "lossOfSale") {
        // For loss of sale: Also check enquiryDate/visitDate/functionDate if available for more accuracy
        // But base duplicate check is still: name + phone + leadType + store
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
      } else if (leadData.leadType === "enquiry") {
        // For enquiry (walk-in): Also check enquiryDate/functionDate if available
        if (leadData.enquiryDate) {
          duplicateQuery.enquiryDate = leadData.enquiryDate;
        }
        // Alternative: if functionDate is available and enquiryDate is not, use functionDate
        else if (leadData.functionDate) {
          duplicateQuery.functionDate = leadData.functionDate;
        }
      }

      // Check if lead exists in reports first (before checking Lead collection)
      // Use normalized phone for consistent matching
      const reportCheckQuery = {
        $or: [
          { "beforeSnapshot.phone": normalized.phone },
          { "leadSnapshot.phone": normalized.phone },
          { "leadData.phone": normalized.phone },
          { "leadData.phone_number": normalized.phone }
        ]
      };

      const existingReport = await Report.findOne(reportCheckQuery);
      if (existingReport) {
        // Lead was moved to reports - skip importing to prevent it from reappearing in leads list
        return { skipped: true, reason: "Lead exists in reports (moved after edit)" };
      }

      // Try exact match first (faster)
      let existing = await Lead.findOne({
        name: normalized.name,
        phone: normalized.phone,
        leadType: leadData.leadType,
        store: normalized.store,
        ...(duplicateQuery.enquiryDate && { enquiryDate: duplicateQuery.enquiryDate }),
        ...(duplicateQuery.visitDate && { visitDate: duplicateQuery.visitDate }),
        ...(duplicateQuery.functionDate && { functionDate: duplicateQuery.functionDate }),
      });

      // If not found, try case-insensitive match (catches case differences)
      if (!existing && normalized.name && normalized.store) {
        existing = await Lead.findOne(duplicateQuery);
        if (existing) {
          console.log(`   ⚠️  Case-insensitive duplicate detected in Leads (${leadData.leadType}):`);
          console.log(`      Existing: name="${existing.name}", store="${existing.store}", phone="${existing.phone}"`);
          console.log(`      Incoming: name="${normalized.name}", store="${normalized.store}", phone="${normalized.phone}"`);
        }
      }

      if (existing) {
        // Record already exists - UPDATE it with new data (preserves _id and createdAt)
        // Remove _id and createdAt from update data to preserve original values
        const updateData = { ...leadData };
        delete updateData._id;
        delete updateData.createdAt;
        // Explicitly include remarks field (string or null)
        if (leadData.hasOwnProperty('remarks')) {
          updateData.remarks = leadData.remarks ?? null;
        }

        const updated = await Lead.findByIdAndUpdate(
          existing._id,
          { $set: updateData },
          { new: true, runValidators: true }
        );
        return { updated: true, leadId: updated._id, name: updated.name, phone: updated.phone, reason: "Updated existing record" };
      }
    }

    // For other lead types (justDial) or new records: create new lead
    // Use try-catch to handle duplicate key errors gracefully
    try {
      // Ensure remarks is explicitly included in leadData before create
      const createData = { ...leadData };
      if (leadData.hasOwnProperty('remarks')) {
        createData.remarks = leadData.remarks ?? null;
      }
      const lead = await Lead.create(createData);
      return { saved: true, leadId: lead._id, name: lead.name, phone: lead.phone };
    } catch (createError) {
      // Handle duplicate key errors (E11000) - treat as skipped, not error
      if (createError.code === 11000 || createError.name === 'MongoServerError' && createError.code === 11000) {
        // Duplicate detected by unique index - this is expected, treat as skipped
        return { skipped: true, reason: "Duplicate detected by unique index" };
      }
      // Re-throw other errors to be caught by outer catch
      throw createError;
    }
  } catch (error) {
    // Handle duplicate key errors gracefully (E11000)
    if (error.code === 11000 || (error.name === 'MongoServerError' && error.code === 11000)) {
      // Duplicate detected - treat as skipped, not error
      return { skipped: true, reason: "Duplicate detected by unique index" };
    }
    // Log other errors
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

