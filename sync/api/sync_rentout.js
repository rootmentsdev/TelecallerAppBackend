import { postAPI, fetchAPI } from "../utils/apiClient.js";
import { mapRentOut } from "../utils/dataMapper.js";
import { saveToMongo } from "../utils/saveToMongo.js";
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
  
  // Step 1: API configuration - Use GetRentOutList API for rent-outs
  const baseUrl = process.env.RENTOUT_API_BASE_URL || process.env.BOOKING_API_BASE_URL || process.env.API_BASE_URL || "http://15.207.90.158:5000";
  const endpoint = process.env.RENTOUT_API_ENDPOINT || "/api/RentOut/GetRentOutList";
  const apiUrl = `${baseUrl}${endpoint}`;
  const apiToken = process.env.RENTOUT_API_KEY || process.env.BOOKING_API_KEY || process.env.API_TOKEN;
  const usePost = process.env.RENTOUT_USE_POST === "true" || false;
  
  // Step 3: Location ID to Store Name mapping
  const LOCATION_ID_TO_STORE_NAME = {
    '1': 'Z- Edapally',
    '3': 'SG-Edappally',
    '5': 'Trivandrum',
    '6': 'Z- Edapally', // Alternative ID for Z.Edapally
    '7': 'PMNA', // Perinthalmanna (matches DSR name)
    '8': 'Z.Kottakkal',
    '9': 'Kottayam',
    '10': 'Perumbavoor',
    '11': 'Trissur',
    '12': 'Chavakkad',
    '13': 'CALICUT',
    '14': 'VATAKARA',
    '15': 'SG-Edappally', // Alternative ID for SG.Edapally
    '16': 'PMNA', // Perinthalmanna (matches DSR name)
    '17': 'KOTTAKAL', // Kottakkal (matches DSR name)
    '18': 'MANJERY',
    '19': 'Palakkad',
    '20': 'KALPETTA', // Kalpetta (matches DSR name)
    '21': 'KANNUR' // Kannur (matches DSR name)
  };
  
  // Step 4: Get last sync time for incremental sync (only fetch new/updated records)
  let lastSyncAt = null;
  let syncLog = await SyncLog.findOne({ syncType: "rentout" });
  
  if (syncLog && syncLog.lastSyncAt) {
    lastSyncAt = syncLog.lastSyncAt;
    console.log(`📅 Last sync: ${lastSyncAt.toISOString()}`);
    console.log(`   Will fetch only records updated after this time`);
  } else {
    console.log(`📅 First sync - will fetch all records`);
  }
  
  // Step 5: Date range configuration - use last sync time for incremental sync
  let dateFrom = process.env.RENTOUT_DATE_FROM || "";
  let dateTo = process.env.RENTOUT_DATE_TO || "";
  let months = process.env.RENTOUT_MONTHS || "";
  
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
  
  console.log(`📡 Using API: ${apiUrl}`);
  console.log(`   Method: ${usePost ? "POST" : "GET"}`);
  if (apiToken) console.log(`🔑 Using authentication token`);
  
  // Step 6: Process each location ID
  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let locationsProcessed = 0;
  
  // Get unique location IDs and their corresponding store names
  const locationIds = Object.keys(LOCATION_ID_TO_STORE_NAME);
  
  console.log(`\n📍 Processing ${locationIds.length} locations using location IDs`);
  console.log(`   Will fetch rent-out data for each location ID`);
  
  for (const locationId of locationIds) {
    const storeName = LOCATION_ID_TO_STORE_NAME[locationId];
    
    console.log(`\n📍 Processing Location ID: ${locationId} (Store: ${storeName})`);
    
    // Try GetRentOutList first (GET request with location ID)
    let data;
    if (usePost) {
      // Prepare request body for POST request
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
        locationID: locationId,
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
      // Use GET request with location ID as query parameter
      const urlWithParams = `${apiUrl}?locationID=${locationId}`;
      console.log(`📡 Calling API: ${urlWithParams}`);
      console.log(`   Method: GET`);
      
      data = await fetchAPI(urlWithParams, {
        headers: {
          "Authorization": apiToken ? `Bearer ${apiToken}` : undefined,
          "accept": "text/plain",
        },
        timeout: 30000,
      });
    }
    
    // Check if GetRentOutList returned empty or error, fallback to GetBookingReport
    if (!data || (data.dataSet && (!data.dataSet.data || (Array.isArray(data.dataSet.data) && data.dataSet.data.length === 0))) || data.status === false) {
      if (data?.errorDescription) {
        console.log(`   ⚠️  GetRentOutList error: ${data.errorDescription}`);
      }
      
      // Fallback to GetBookingReport if GetRentOutList fails or returns no data
      const fallbackUrl = `${baseUrl}/api/Reports/GetBookingReport`;
      console.log(`   📡 Trying fallback API: ${fallbackUrl}`);
      
      let finalDateFrom = dateFrom;
      let finalDateTo = dateTo;
      let finalMonths = months;
      
      // If no date range specified and no last sync, default to last 12 months (first sync)
      if (!finalDateFrom && !finalDateTo && !finalMonths && !lastSyncAt) {
        finalMonths = "12";
      }
      
      const fallbackData = await postAPI(
        fallbackUrl,
        {
          bookingNo: "",
          dateFrom: finalDateFrom || "",
          dateTo: finalDateTo || "",
          userName: "",
          months: finalMonths || "",
          fromLocation: "",
          userID: "",
          locationID: locationId, // Use location ID for filtering
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
        console.log(`   ℹ️  No data for location ID ${locationId}`);
        continue;
      }
      
      data = fallbackData;
    }
    
    // Log full response for debugging
    console.log(`   📥 Response status: ${data.status}, errorDescription: ${data.errorDescription || "none"}`);
    
    // Handle different response formats
    let dataArray = null;
    if (!Array.isArray(data)) {
      // Check for dataSet.data structure
      if (data.dataSet) {
        if (data.dataSet === null) {
          console.log(`   ℹ️  dataSet is null - no rent-out data available`);
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
      console.log(`   ℹ️  No rent-out data for location ID ${locationId}`);
      continue;
    }
    
    console.log(`   📊 Found ${dataArray.length} records for location ID ${locationId}`);
    
    // Process and save rent-out data with progress indicator
    let saved = 0;
    let skipped = 0;
    let errors = 0;
    const progressInterval = Math.max(1, Math.floor(dataArray.length / 10)); // Show progress every 10%
    
    for (let i = 0; i < dataArray.length; i++) {
      const row = dataArray[i];
      
      // Show progress for large datasets
      if (dataArray.length > 100 && (i % progressInterval === 0 || i === dataArray.length - 1)) {
        const progress = ((i + 1) / dataArray.length * 100).toFixed(0);
        process.stdout.write(`\r   ⏳ Processing: ${progress}% (${i + 1}/${dataArray.length})`);
      }
      
      // Add store name to the row data for mapping
      const rowWithStore = {
        ...row,
        store: storeName, // Use store name from location ID mapping
      };
      
      const mapped = mapRentOut(rowWithStore);
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
    
    if (dataArray.length > 100) {
      console.log(); // New line after progress indicator
    }
    
    console.log(`   ✅ Saved/Updated: ${saved}, ⏭️  Skipped: ${skipped}, ❌ Errors: ${errors}`);
    
    totalSaved += saved;
    totalSkipped += skipped;
    totalErrors += errors;
    locationsProcessed++;
    
    // Small delay between API calls to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Update sync log with latest sync time
  const syncEndTime = new Date();
  await SyncLog.findOneAndUpdate(
    { syncType: "rentout" },
    {
      lastSyncAt: syncEndTime,
      lastSyncCount: totalSaved,
      status: totalErrors > 0 ? "partial" : "success",
      errorMessage: totalErrors > 0 ? `${totalErrors} errors occurred` : null,
    },
    { upsert: true, new: true }
  );
  
  console.log(`\n✅ Rent-Out sync completed!`);
  console.log(`   📊 Locations processed: ${locationsProcessed}/${locationIds.length}`);
  console.log(`   💾 Total saved/updated: ${totalSaved} (duplicates automatically prevented)`);
  console.log(`   ⏭️  Total skipped: ${totalSkipped}`);
  console.log(`   ❌ Total errors: ${totalErrors}`);
  console.log(`   📅 Next sync will fetch records updated after: ${syncEndTime.toISOString()}`);
};

// Export run function for use in runAll.js
export { run };

// Auto-run if called directly (not imported)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('sync_rentout.js')) {
  run().catch((error) => {
    console.error("❌ Rent-Out sync failed:", error.message);
    process.exit(1);
  });
}

