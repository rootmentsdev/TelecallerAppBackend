import { postAPI, fetchAPI } from "../utils/apiClient.js";
import { mapReturn } from "../utils/dataMapper.js";
import { saveToMongo } from "../utils/saveToMongo.js";
import SyncLog from "../../models/SyncLog.js";
import { LEAD_API_ID_MAP } from "../utils/storeMap.js";
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
    console.log("MongoDB Connected for return sync");
  } catch (err) {
    console.error("MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

const run = async () => {
  console.log("🔄 Starting Return API sync...");

  // Connect to MongoDB
  await connectDB();

  // Step 1: API configuration - Use new Return API
  const baseUrl = process.env.RETURN_API_BASE_URL || "https://rentalapi.rootments.live";
  const endpoint = process.env.RETURN_API_ENDPOINT || "/api/Reports/GetReturnReport";
  const apiUrl = `${baseUrl}${endpoint}`;
  const apiToken = process.env.RETURN_API_KEY || process.env.API_TOKEN;
  // Always use POST for GetReturnReport
  const usePost = true;

  // Step 2: Location ID to Store Name mapping
  const LOCATION_ID_TO_STORE_NAME = LEAD_API_ID_MAP;

  // Step 3: Get last sync time for incremental sync (only fetch new/updated records)
  let lastSyncAt = null;
  // Get the most recent successful sync log
  let syncLog = await SyncLog.findOne({ syncType: "return", status: "success" }).sort({ lastSyncAt: -1 });

  if (syncLog && syncLog.lastSyncAt) {
    lastSyncAt = syncLog.lastSyncAt;
    console.log(`📅 Last sync: ${lastSyncAt.toISOString()}`);
    console.log(`   Will fetch only records updated after this time`);
  } else {
    console.log(`📅 First sync - will fetch all records`);
  }

  // Step 4: Date range configuration - use last sync time for incremental sync
  let dateFrom = process.env.RETURN_DATE_FROM || "";
  let dateTo = process.env.RETURN_DATE_TO || "";
  let months = process.env.RETURN_MONTHS || "";

  // Date range configuration - prioritize months parameter for better API compatibility
  if (!dateFrom && !dateTo && !months) {
    if (lastSyncAt) {
      // For incremental sync, use months parameter (more reliable than dateFrom)
      // Calculate months since last sync (minimum 1 month, maximum 12 months)
      const monthsSinceSync = Math.min(12, Math.max(1, Math.floor((Date.now() - lastSyncAt.getTime()) / (1000 * 60 * 60 * 24 * 30))));
      months = String(monthsSinceSync);
      console.log(`   Using incremental sync: last ${months} months`);
    } else {
      // First sync - default to last 12 months
      months = "12";
      console.log(`   Using default: last 12 months (first sync)`);
    }
  } else {
    // Use environment variables if specified
    if (dateFrom) console.log(`📅 Date from: ${dateFrom}`);
    if (dateTo) console.log(`📅 Date to: ${dateTo}`);
    if (months) console.log(`📅 Months: ${months}`);
  }

  console.log(`📡 Using API: ${apiUrl}`);
  console.log(`   Method: ${usePost ? "POST" : "GET"}`);
  if (apiToken) console.log(`🔑 Using authentication token`);

  // Step 5: Process each location ID
  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let locationsProcessed = 0;

  // Get unique location IDs and their corresponding store names
  const locationIds = Object.keys(LOCATION_ID_TO_STORE_NAME);

  console.log(`\n📍 Processing ${locationIds.length} locations using location IDs`);
  console.log(`   Will fetch return data for each location ID`);

  for (const locationId of locationIds) {
    const storeName = LOCATION_ID_TO_STORE_NAME[locationId];

    console.log(`\n📍 Processing Location ID: ${locationId} (Store: ${storeName})`);

    // Use POST request with GetReturnReport endpoint
    let finalDateFrom = dateFrom;
    let finalDateTo = dateTo;
    let finalMonths = months;

    // If no date range specified and no last sync, default to last 12 months (first sync)
    if (!finalDateFrom && !finalDateTo && !finalMonths && !lastSyncAt) {
      finalMonths = "12";
    }

    const requestBody = {
      bookingNo: "",
      dateFrom: finalDateFrom || "",
      dateTo: finalDateTo || "",
      userName: "",
      months: finalMonths || "",
      fromLocation: "",
      userID: "",
      locationID: String(locationId), // Ensure it's a string
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

    // Check if API returned error or empty data
    if (!data) {
      console.log(`   ⚠️  API returned null/undefined for location ID ${locationId}`);
      continue;
    }

    // Log full response for debugging
    if (data.status !== undefined) {
      console.log(`   📥 Response status: ${data.status}`);
    }
    if (data.errorDescription) {
      console.log(`   ⚠️  Error: ${data.errorDescription}`);
    }

    // Debug: Log response structure for first location
    if (locationId === '1') {
      console.log(`   🔍 Debug - Response structure:`, JSON.stringify(data, null, 2).substring(0, 500));
      console.log(`   🔍 Response keys:`, Object.keys(data || {}));
    }

    // Check if status is false
    if (data.status === false) {
      console.log(`   ℹ️  API returned status=false for location ID ${locationId}`);
      continue;
    }

    // Handle different response formats
    let dataArray = null;
    if (!Array.isArray(data)) {
      // Check for dataSet.data structure
      if (data.dataSet) {
        if (data.dataSet === null) {
          console.log(`   ℹ️  dataSet is null - no return data available`);
          continue;
        } else if (data.dataSet.data && Array.isArray(data.dataSet.data)) {
          dataArray = data.dataSet.data;
        } else if (Array.isArray(data.dataSet)) {
          dataArray = data.dataSet;
        }
      } else if (data.data && Array.isArray(data.data)) {
        dataArray = data.data;
      } else if (data.result && Array.isArray(data.result)) {
        dataArray = data.result;
      } else {
        console.warn(`   ⚠️  Invalid response format`);
        totalErrors++;
        continue;
      }
    } else {
      dataArray = data;
    }

    if (!dataArray || dataArray.length === 0) {
      console.log(`   ℹ️  No data for location ID ${locationId}`);
      continue;
    }

    // Filter: Only process records that have returnDate or return_date (return records)
    const returnRecords = dataArray.filter(row => {
      return row.returnDate || row.return_date || row.ReturnDate;
    });

    if (returnRecords.length === 0) {
      console.log(`   ℹ️  No return data for location ID ${locationId} (${dataArray.length} total records, none are returns)`);
      continue;
    }

    console.log(`   📊 Found ${dataArray.length} total records, ${returnRecords.length} return records for location ID ${locationId}`);

    // Process and save return data with progress indicator
    let saved = 0;
    let skipped = 0;
    let errors = 0;
    const totalRecordsInLocation = returnRecords.length;
    const progressInterval = Math.max(1, Math.floor(totalRecordsInLocation / 20)); // Update every 5%

    for (let i = 0; i < totalRecordsInLocation; i++) {
      const row = returnRecords[i];

      // Add store name to the row data for mapping
      const rowWithStore = {
        ...row,
        store: storeName, // Use store name from location ID mapping
      };

      const mapped = mapReturn(rowWithStore);
      if (mapped) {
        const result = await saveToMongo(mapped);
        if (result.saved) {
          saved++;
        } else if (result.skipped) {
          // Record already exists - skipped (not updated)
          skipped++;
        } else {
          errors++;
        }
      } else {
        skipped++;
      }

      // Show progress AFTER processing (so counters are accurate)
      if (totalRecordsInLocation > 100 && (i % progressInterval === 0 || i === totalRecordsInLocation - 1)) {
        const progress = ((i + 1) / totalRecordsInLocation * 100).toFixed(1);
        process.stdout.write(`\r   ⏳ Progress: ${progress}% (${i + 1}/${totalRecordsInLocation}) | Saved: ${saved}, Skipped: ${skipped}, Errors: ${errors}`);
      }
    }

    if (totalRecordsInLocation > 100) {
      process.stdout.write('\n'); // New line after progress indicator
    }

    console.log(`   ✅ New records saved: ${saved}, ⏭️  Skipped (exists): ${skipped}, ❌ Errors: ${errors}`);

    totalSaved += saved;
    totalSkipped += skipped;
    totalErrors += errors;
    locationsProcessed++;

    // Small delay between API calls to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Update sync log with latest sync time (create new entry for history)
  const syncEndTime = new Date();
  const trigger = process.env.SYNC_TRIGGER || "auto";

  try {
    await SyncLog.create({
      syncType: "return",
      trigger: trigger,
      lastSyncAt: syncEndTime,
      lastSyncCount: totalSaved,
      status: totalErrors > 0 ? "partial" : "success",
      errorMessage: totalErrors > 0 ? `${totalErrors} errors occurred` : null,
    });
    console.log(`📝 Sync log saved`);
  } catch (error) {
    console.error("❌ Error saving sync log:", error.message);
  }

  console.log(`\n✅ Return sync completed!`);
  console.log(`   📊 Locations processed: ${locationsProcessed}/${locationIds.length}`);
  console.log(`   💾 Total new records saved: ${totalSaved}`);
  console.log(`   ⏭️  Total skipped (already exists): ${totalSkipped}`);
  console.log(`   ❌ Total errors: ${totalErrors}`);
  console.log(`   📅 Next sync will fetch records updated after: ${syncEndTime.toISOString()}`);
};

// Export run function for use in runAll.js
export { run };

// Auto-run if called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('sync_return.js')) {
  run().catch((error) => {
    console.error("❌ Return sync failed:", error.message);
    process.exit(1);
  });
}