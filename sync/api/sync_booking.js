import { postAPI, fetchAPI } from "../utils/apiClient.js";
import { mapBooking } from "../utils/dataMapper.js";
import { saveToMongo } from "../utils/saveToMongo.js";
import Store from "../../models/Store.js";
import Lead from "../../models/Lead.js";
import SyncLog from "../../models/SyncLog.js";
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
  
  // Step 2: API configuration
  // Use new API base URL for booking confirmation
  const baseUrl = process.env.BOOKING_API_BASE_URL || process.env.API_BASE_URL || "http://15.207.90.158:5000";
  const endpoint = process.env.BOOKING_API_ENDPOINT || "/api/GetBooking/GetBookingList";
  const apiUrl = `${baseUrl}${endpoint}`;
  const apiToken = process.env.BOOKING_API_KEY || process.env.API_TOKEN;
  const usePost = process.env.BOOKING_USE_POST === "true" || false;
  
  // Step 3: Get last sync time for incremental sync (only fetch new/updated records)
  let lastSyncAt = null;
  let syncLog = await SyncLog.findOne({ syncType: "booking" });
  
  if (syncLog && syncLog.lastSyncAt) {
    lastSyncAt = syncLog.lastSyncAt;
    console.log(`📅 Last sync: ${lastSyncAt.toISOString()}`);
    console.log(`   Will fetch only records updated after this time`);
  } else {
    console.log(`📅 First sync - will fetch all records`);
  }
  
  // Step 4: Date range configuration - use last sync time for incremental sync
  let dateFrom = process.env.BOOKING_DATE_FROM || "";
  let dateTo = process.env.BOOKING_DATE_TO || "";
  let months = process.env.BOOKING_MONTHS || "";
  
  // If last sync exists, use it as dateFrom for incremental sync
  if (lastSyncAt && !dateFrom) {
    // Format date as DD-MM-YYYY for API
    const day = String(lastSyncAt.getDate()).padStart(2, '0');
    const month = String(lastSyncAt.getMonth() + 1).padStart(2, '0');
    const year = lastSyncAt.getFullYear();
    dateFrom = `${day}-${month}-${year}`;
    console.log(`   Using incremental sync from: ${dateFrom}`);
  }
  
  // If no date range specified and no last sync, default to last 12 months (first sync)
  if (!dateFrom && !dateTo && !months && !lastSyncAt) {
    months = "12";
    console.log(`   Using default: last 12 months (first sync)`);
  }
  
  console.log(`\n📍 Fetching booking data from GetBookingList API`);
  console.log(`   Method: ${usePost ? "POST" : "GET"}`);
  console.log(`   Will filter by store name in response data`);
  
  let data;
  if (usePost) {
    // Prepare request body for POST request
    const requestBody = {
      bookingNo: "", // Empty for all bookings
      dateFrom: dateFrom || "",
      dateTo: dateTo || "",
      userName: "",
      months: months || "",
      fromLocation: "",
      userID: "",
      locationID: "", // Use empty string to get all locations data
    };
    
    console.log(`📡 Calling API: ${apiUrl}`);
    console.log(`   📤 Request body:`, JSON.stringify(requestBody));
    
    data = await postAPI(
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
  } else {
    // Use GET request (default for GetBookingList)
    console.log(`📡 Calling API: ${apiUrl}`);
    console.log(`   Method: GET`);
    
    data = await fetchAPI(apiUrl, {
      headers: {
        "Authorization": apiToken ? `Bearer ${apiToken}` : undefined,
        "accept": "text/plain",
      },
      timeout: 30000,
    });
  }
  
  if (!data) {
    console.warn(`⚠️  No data received from GetBookingList API, trying fallback...`);
    
    // Fallback to GetBookingReport if GetBookingList fails or returns no data
    const fallbackUrl = `${baseUrl}/api/Reports/GetBookingReport`;
    console.log(`📡 Trying fallback API: ${fallbackUrl}`);
    
    const fallbackData = await postAPI(
      fallbackUrl,
      {
        bookingNo: "",
        dateFrom: dateFrom || "",
        dateTo: dateTo || "",
        userName: "",
        months: months || "",
        fromLocation: "",
        userID: "",
        locationID: "",
      },
      {
        headers: {
          "Authorization": apiToken ? `Bearer ${apiToken}` : undefined,
          "Content-Type": "application/json-patch+json",
          "accept": "text/plain",
        },
      }
    );
    
    if (!fallbackData) {
      console.warn(`⚠️  Fallback API also returned no data`);
      return;
    }
    
    data = fallbackData;
  }
  
  // Log full response for debugging
  console.log(`   📥 Response status: ${data.status}, errorDescription: ${data.errorDescription || "none"}`);
  
  // Debug: Log the actual response structure
  console.log(`   🔍 Response keys:`, Object.keys(data || {}));
  if (data && typeof data === 'object') {
    console.log(`   🔍 Response structure preview:`, JSON.stringify(data, null, 2).substring(0, 500));
  }
  
  // Handle different response formats
  let allDataArray = null;
  if (!Array.isArray(data)) {
    // Check for dataSet.data structure
    if (data.dataSet) {
      if (data.dataSet === null) {
        console.log(`ℹ️  dataSet is null - no booking data available`);
        return;
      } else if (data.dataSet.data && Array.isArray(data.dataSet.data)) {
        allDataArray = data.dataSet.data;
        console.log(`   ✅ Found data in dataSet.data (${allDataArray.length} records)`);
      } else if (Array.isArray(data.dataSet)) {
        allDataArray = data.dataSet;
        console.log(`   ✅ Found data in dataSet (${allDataArray.length} records)`);
      }
    } else if (data.data && Array.isArray(data.data)) {
      allDataArray = data.data;
      console.log(`   ✅ Found data in data (${allDataArray.length} records)`);
    } else if (data.result && Array.isArray(data.result)) {
      allDataArray = data.result;
      console.log(`   ✅ Found data in result (${allDataArray.length} records)`);
    } else {
      console.warn(`⚠️  Invalid response format - data exists but structure not recognized`);
      console.warn(`   Full response structure:`, JSON.stringify(data, null, 2).substring(0, 800));
      // Try fallback to GetBookingReport
      console.log(`   🔄 Attempting fallback to GetBookingReport...`);
      const fallbackUrl = `${baseUrl}/api/Reports/GetBookingReport`;
      const fallbackData = await postAPI(
        fallbackUrl,
        {
          bookingNo: "",
          dateFrom: dateFrom || "",
          dateTo: dateTo || "",
          userName: "",
          months: months || "",
          fromLocation: "",
          userID: "",
          locationID: "",
        },
        {
          headers: {
            "Authorization": apiToken ? `Bearer ${apiToken}` : undefined,
            "Content-Type": "application/json-patch+json",
            "accept": "text/plain",
          },
        }
      );
      
      if (fallbackData) {
        console.log(`   ✅ Fallback API returned data`);
        // Process fallback data
        if (fallbackData.dataSet && Array.isArray(fallbackData.dataSet.data)) {
          allDataArray = fallbackData.dataSet.data;
        } else if (Array.isArray(fallbackData.dataSet)) {
          allDataArray = fallbackData.dataSet;
        } else if (Array.isArray(fallbackData)) {
          allDataArray = fallbackData;
        } else {
          console.warn(`⚠️  Fallback API also has unrecognized structure`);
          return;
        }
      } else {
        return;
      }
    }
  } else {
    allDataArray = data;
    console.log(`   ✅ Response is direct array (${allDataArray.length} records)`);
  }
  
  if (!allDataArray || allDataArray.length === 0) {
    console.log(`ℹ️  No booking data received from API (empty array or null)`);
    return;
  }
  
  console.log(`📊 Found ${allDataArray.length} total records from API`);
  console.log(`   Filtering by store names and processing...`);
  
  // Step 4: Process each store and filter data by location field
  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let storesProcessed = 0;
  
  for (const store of stores) {
    const storeName = store.name;
    
    if (!storeName) {
      continue;
    }
    
    console.log(`\n📍 Processing store: ${storeName}`);
    
    // Filter data by location field (API returns location name, not code)
    const storeData = allDataArray.filter(row => {
      const rowLocation = (row.location || row.Location || row.store || "").trim();
      return rowLocation === storeName || rowLocation.includes(storeName) || storeName.includes(rowLocation);
    });
    
    if (storeData.length === 0) {
      console.log(`   ℹ️  No data for store "${storeName}"`);
      continue;
    }
    
    console.log(`   📊 Found ${storeData.length} records for "${storeName}"`);
    
    // Process and save booking data
    let saved = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const row of storeData) {
      // Add store name to the row data for mapping
      const rowWithStore = {
        ...row,
        store: storeName, // Use store name from database
      };
      
      const mapped = mapBooking(rowWithStore);
      if (mapped) {
        const result = await saveToMongo(mapped);
        if (result.saved) {
          saved++;
        } else if (result.updated) {
          // Count updates as saved (prevented duplicate)
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
    
    console.log(`   ✅ Saved/Updated: ${saved}, ⏭️  Skipped: ${skipped}, ❌ Errors: ${errors}`);
    
    totalSaved += saved;
    totalSkipped += skipped;
    totalErrors += errors;
    storesProcessed++;
  }
  
  // Update sync log with latest sync time
  const syncEndTime = new Date();
  await SyncLog.findOneAndUpdate(
    { syncType: "booking" },
    {
      lastSyncAt: syncEndTime,
      lastSyncCount: totalSaved,
      status: totalErrors > 0 ? "partial" : "success",
      errorMessage: totalErrors > 0 ? `${totalErrors} errors occurred` : null,
    },
    { upsert: true, new: true }
  );
  
  console.log(`\n✅ Booking sync completed!`);
  console.log(`   📊 Stores processed: ${storesProcessed}/${stores.length}`);
  console.log(`   💾 Total saved/updated: ${totalSaved} (duplicates automatically prevented)`);
  console.log(`   ⏭️  Total skipped: ${totalSkipped}`);
  console.log(`   ❌ Total errors: ${totalErrors}`);
  console.log(`   📅 Next sync will fetch records updated after: ${syncEndTime.toISOString()}`);
};

// Export run function for use in runAll.js
export { run };

// Auto-run if called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('sync_booking.js')) {
  run().catch((error) => {
    console.error("❌ Booking sync failed:", error.message);
    process.exit(1);
  });
}

