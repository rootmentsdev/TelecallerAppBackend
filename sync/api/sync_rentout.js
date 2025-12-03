import { postAPI } from "../utils/apiClient.js";
import { mapRentOut } from "../utils/dataMapper.js";
import { saveToMongo } from "../utils/saveToMongo.js";
import Store from "../../models/Store.js";
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
    console.log("MongoDB Connected for rent-out sync");
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const run = async () => {
  console.log("🔄 Starting Rent-Out API sync...");
  
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
  
  // Step 2: API configuration - Use Booking Report API for rent-outs
  const baseUrl = process.env.RENTOUT_API_BASE_URL || process.env.BOOKING_API_BASE_URL || process.env.API_BASE_URL || "https://rentalapi.rootments.live";
  const endpoint = "/api/Reports/GetBookingReport";
  const apiUrl = `${baseUrl}${endpoint}`;
  const apiToken = process.env.RENTOUT_API_KEY || process.env.BOOKING_API_KEY || process.env.API_TOKEN;
  
  // Step 3: Date range configuration (optional - can be empty strings for all data)
  const dateFrom = process.env.RENTOUT_DATE_FROM || "";
  const dateTo = process.env.RENTOUT_DATE_TO || "";
  const months = process.env.RENTOUT_MONTHS || "";
  
  console.log(`📡 Using API: ${apiUrl}`);
  if (apiToken) console.log(`🔑 Using authentication token`);
  
  // Step 4: Process each store location
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
    
    // Prepare request body for GetBookingReport API (same as booking sync)
    const requestBody = {
      bookingNo: "", // Empty for all bookings/rent-outs
      dateFrom: dateFrom || "",
      dateTo: dateTo || "",
      userName: "",
      months: months || "",
      fromLocation: "",
      userID: "",
      locationID: locationCode.toString(), // Use store location code
    };
    
    console.log(`📡 Calling API: ${apiUrl}`);
    
    console.log(`   📤 Request body:`, JSON.stringify(requestBody));
    
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
      console.warn(`⚠️  No data received for location ${locationCode}`);
      totalErrors++;
      continue;
    }
    
    // Log full response for debugging
    console.log(`   📥 Response status: ${data.status}, errorDescription: ${data.errorDescription || "none"}`);
    
    // Check for API error status
    if (data.status === false) {
      const errorMsg = data.errorDescription || "Unknown error";
      if (errorMsg && errorMsg.trim() !== "" && !errorMsg.includes("Unknown column")) {
        console.warn(`⚠️  API error for location ${locationCode}: ${errorMsg}`);
      }
      
      // Check if there's still data despite error status
      if (!data.dataSet || data.dataSet === null || !data.dataSet.data || data.dataSet.data.length === 0) {
        console.log(`ℹ️  No rent-out data for location ${locationCode}`);
        continue;
      }
    }
    
    // Handle different response formats
    let dataArray = null;
    if (!Array.isArray(data)) {
      // Check for dataSet.data structure
      if (data.dataSet) {
        if (data.dataSet === null) {
          console.log(`ℹ️  dataSet is null for location ${locationCode} - no rent-out data available`);
          continue;
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
        console.warn(`⚠️  Invalid response format for location ${locationCode}`);
        console.warn(`   Response structure:`, JSON.stringify(data, null, 2).substring(0, 300));
        totalErrors++;
        continue;
      }
    } else {
      dataArray = data;
    }
    
    if (!dataArray || dataArray.length === 0) {
      console.log(`ℹ️  No rent-out data for location ${locationCode}`);
      continue;
    }
    
    console.log(`📊 Found ${dataArray.length} rent-out records for location ${locationCode}`);
    
    // Step 4: Process and save rent-out data
    let saved = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const row of dataArray) {
      // Add store name to the row data for mapping
      const rowWithStore = {
        ...row,
        store: storeName, // Use store name from database
        storeCode: locationCode, // Keep location code for reference
      };
      
      const mapped = mapRentOut(rowWithStore);
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
    
    console.log(`   ✅ Saved: ${saved}, ⏭️  Skipped: ${skipped}, ❌ Errors: ${errors}`);
    
    totalSaved += saved;
    totalSkipped += skipped;
    totalErrors += errors;
    storesProcessed++;
    
    // Small delay between API calls to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n✅ Rent-Out sync completed!`);
  console.log(`   📊 Stores processed: ${storesProcessed}/${stores.length}`);
  console.log(`   💾 Total saved: ${totalSaved}`);
  console.log(`   ⏭️  Total skipped: ${totalSkipped}`);
  console.log(`   ❌ Total errors: ${totalErrors}`);
};

run().catch((error) => {
  console.error("❌ Rent-Out sync failed:", error.message);
  process.exit(1);
});

