import { postAPI } from "../utils/apiClient.js";
import { mapBooking } from "../utils/dataMapper.js";
import { saveToMongo } from "../utils/saveToMongo.js";
import Store from "../../models/Store.js";
import Lead from "../../models/Lead.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return; // Already connected
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected for booking sync");
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const run = async () => {
  console.log("🔄 Starting Booking API sync...");
  
  // Connect to MongoDB
  await connectDB();
  
  // Step 1: Fetch all stores from database
  console.log("📦 Fetching stores from database...");
  const stores = await Store.find({ isActive: true }).select("code name");
  
  if (!stores || stores.length === 0) {
    console.warn("⚠️  No stores found in database. Please sync stores first using: npm run sync:stores");
    return;
  }
  
  console.log(`✅ Found ${stores.length} active stores`);
  
  // Step 2: Fetch rent-out data to get booking numbers
  console.log("\n📋 Fetching rent-out data to extract booking numbers...");
  const rentOutLeads = await Lead.find({
    leadType: "rentOutFeedback",
    bookingNo: { $exists: true, $ne: "" }
  }).select("bookingNo store");
  
  console.log(`✅ Found ${rentOutLeads.length} rent-out leads with booking numbers`);
  
  // Group booking numbers by store/location
  const bookingNumbersByStore = {};
  rentOutLeads.forEach(lead => {
    if (lead.bookingNo && lead.store) {
      if (!bookingNumbersByStore[lead.store]) {
        bookingNumbersByStore[lead.store] = [];
      }
      if (!bookingNumbersByStore[lead.store].includes(lead.bookingNo)) {
        bookingNumbersByStore[lead.store].push(lead.bookingNo);
      }
    }
  });
  
  // Step 3: API configuration
  const baseUrl = process.env.BOOKING_API_BASE_URL || process.env.API_BASE_URL || "https://rentalapi.rootments.live";
  const endpoint = "/api/Reports/GetBookingReport";
  const apiUrl = `${baseUrl}${endpoint}`;
  const apiToken = process.env.BOOKING_API_KEY || process.env.API_TOKEN;
  
  // Step 4: Date range configuration (optional - can be empty strings for all data)
  const dateFrom = process.env.BOOKING_DATE_FROM || "";
  const dateTo = process.env.BOOKING_DATE_TO || "";
  const months = process.env.BOOKING_MONTHS || "";
  
  // Step 5: Process each store location
  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let storesProcessed = 0;
  
  for (const store of stores) {
    const locationCode = store.code;
    const storeName = store.name;
    
    if (!locationCode) {
      console.log(`⏭️  Skipping store "${storeName}" - no location code`);
      continue;
    }
    
    console.log(`\n📍 Processing store: ${storeName} (Location Code: ${locationCode})`);
    
    // Get booking numbers from rent-out data for this store
    const bookingNumbers = bookingNumbersByStore[storeName] || [];
    
    if (bookingNumbers.length > 0) {
      console.log(`   📋 Found ${bookingNumbers.length} booking number(s) from rent-out data: ${bookingNumbers.join(", ")}`);
    } else {
      console.log(`   ℹ️  No booking numbers found in rent-out data for this store - will fetch all bookings for this location`);
    }
    
    // Process each booking number separately, or all at once if API supports it
    const bookingsToProcess = bookingNumbers.length > 0 ? bookingNumbers : [""]; // Empty string means get all
    
    let saved = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const bookingNo of bookingsToProcess) {
      console.log(`📡 Calling API: ${apiUrl}`);
      
      // Prepare request body for GetBookingReport API
      // Use booking number from rent-out data if available, otherwise use empty string for all
      const requestBody = {
        bookingNo: bookingNo, // Single booking number or empty for all
        dateFrom: dateFrom || "",
        dateTo: dateTo || "",
        userName: "",
        months: months || "",
        fromLocation: "",
        userID: "",
        locationID: locationCode.toString(), // Ensure it's a string
      };
      
      if (bookingNo) {
        console.log(`   📤 Request body (bookingNo: ${bookingNo}):`, JSON.stringify(requestBody));
      } else {
        console.log(`   📤 Request body (all bookings):`, JSON.stringify(requestBody));
      }
      
      const data = await postAPI(
        apiUrl,
        requestBody,
        {
          headers: {
            "Authorization": apiToken ? `Bearer ${apiToken}` : undefined,
            "Content-Type": "application/json-patch+json",
            "accept": "text/plain",
          },
        }
      );
      
      if (!data) {
        console.warn(`⚠️  No data received for location ${locationCode}${bookingNo ? ` (bookingNo: ${bookingNo})` : ""}`);
        errors++;
        continue; // Continue to next booking number
      }
      
      // Log full response for debugging
      console.log(`   📥 Response status: ${data.status}, errorDescription: ${data.errorDescription || "none"}`);
      
      // Check for API error status
      if (data.status === false) {
        const errorMsg = data.errorDescription || "Unknown error";
        if (errorMsg && errorMsg.trim() !== "") {
          console.warn(`⚠️  API error for location ${locationCode}${bookingNo ? ` (bookingNo: ${bookingNo})` : ""}: ${errorMsg}`);
          
          // If error mentions "Unknown column", the request format might be wrong
          if (errorMsg.includes("Unknown column")) {
            console.log(`   💡 This might indicate the API expects different parameter names or format`);
          }
        }
        
        // Check if there's still data despite error status
        if (!data.dataSet || data.dataSet === null || !data.dataSet.data || data.dataSet.data.length === 0) {
          console.log(`ℹ️  No booking data for location ${locationCode}${bookingNo ? ` (bookingNo: ${bookingNo})` : ""}`);
          continue; // Continue to next booking number
        }
      }
      
      // Handle different response formats
      let dataArray = null;
      if (!Array.isArray(data)) {
        // Check for dataSet.data structure
        if (data.dataSet) {
          if (data.dataSet === null) {
            console.log(`ℹ️  dataSet is null for location ${locationCode}${bookingNo ? ` (bookingNo: ${bookingNo})` : ""} - no booking data available`);
            continue; // Continue to next booking number
          } else if (data.dataSet.data && Array.isArray(data.dataSet.data)) {
            dataArray = data.dataSet.data;
          } else if (Array.isArray(data.dataSet)) {
            // dataSet might be directly an array
            dataArray = data.dataSet;
          }
        } else if (data.data && Array.isArray(data.data)) {
          dataArray = data.data;
        } else if (data.result && Array.isArray(data.result)) {
          dataArray = data.result;
        } else {
          console.warn(`⚠️  Invalid response format for location ${locationCode}${bookingNo ? ` (bookingNo: ${bookingNo})` : ""}`);
          console.warn(`   Response structure:`, JSON.stringify(data, null, 2).substring(0, 300));
          errors++;
          continue; // Continue to next booking number
        }
      } else {
        dataArray = data;
      }
      
      if (!dataArray || dataArray.length === 0) {
        console.log(`ℹ️  No booking data for location ${locationCode}${bookingNo ? ` (bookingNo: ${bookingNo})` : ""}`);
        continue; // Continue to next booking number
      }
      
      console.log(`📊 Found ${dataArray.length} booking records for location ${locationCode}${bookingNo ? ` (bookingNo: ${bookingNo})` : ""}`);
      
      // Process and save booking data
      for (const row of dataArray) {
        // Add store name to the row data for mapping
        const rowWithStore = {
          ...row,
          store: storeName, // Use store name from database
          storeCode: locationCode, // Keep location code for reference
        };
        
        const mapped = mapBooking(rowWithStore);
        if (mapped) {
          const result = await saveToMongo(mapped);
          if (result.saved) {
            saved++;
          } else if (result.skipped) {
            skipped++;
          } else {
            errors++;
          }
        } else {
          skipped++;
        }
      }
      
      // Small delay between API calls to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`   ✅ Saved: ${saved}, ⏭️  Skipped: ${skipped}, ❌ Errors: ${errors}`);
    
    totalSaved += saved;
    totalSkipped += skipped;
    totalErrors += errors;
    storesProcessed++;
    
    // Small delay between stores
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n✅ Booking sync completed!`);
  console.log(`   📊 Stores processed: ${storesProcessed}/${stores.length}`);
  console.log(`   💾 Total saved: ${totalSaved}`);
  console.log(`   ⏭️  Total skipped: ${totalSkipped}`);
  console.log(`   ❌ Total errors: ${totalErrors}`);
};

run().catch((error) => {
  console.error("❌ Booking sync failed:", error.message);
  process.exit(1);
});

