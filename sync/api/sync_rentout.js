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
  
  // Step 1: API configuration - Use GetBookingReport (same endpoint as booking, but filter for rent-out data)
  // Note: The API might return both booking and rent-out data from GetBookingReport
  const baseUrl = process.env.RENTOUT_API_BASE_URL || process.env.BOOKING_API_BASE_URL || process.env.API_BASE_URL || "http://15.207.90.158:5000";
  const endpoint = process.env.RENTOUT_API_ENDPOINT || "/api/Reports/GetBookingReport"; // Use same endpoint as booking
  const apiUrl = `${baseUrl}${endpoint}`;
  const apiToken = process.env.RENTOUT_API_KEY || process.env.BOOKING_API_KEY || process.env.API_TOKEN;
  // Always use POST for GetBookingReport
  const usePost = true;
  
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
    
    // Use POST request with GetBookingReport endpoint (same as booking uses)
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
      console.log(`   ℹ️  No data for location ID ${locationId}`);
      continue;
    }
    
    // Filter: Only process records that have rentOutDate or returnDate (rent-out records)
    // The API returns both booking and rent-out records, so we filter for rent-out only
    const rentOutRecords = dataArray.filter(row => {
      return row.rentOutDate || row.rentOut_date || row.rentOutDate || row.returnDate || row.return_date || row.ReturnDate;
    });
    
    if (rentOutRecords.length === 0) {
      console.log(`   ℹ️  No rent-out data for location ID ${locationId} (${dataArray.length} total records, none are rent-out)`);
      continue;
    }
    
    console.log(`   📊 Found ${dataArray.length} total records, ${rentOutRecords.length} rent-out records for location ID ${locationId}`);
    
    // Process and save rent-out data with progress indicator
    let saved = 0;
    let skipped = 0;
    let errors = 0;
    const totalRecordsInLocation = rentOutRecords.length;
    const progressInterval = Math.max(1, Math.floor(totalRecordsInLocation / 20)); // Update every 5%
    
    for (let i = 0; i < totalRecordsInLocation; i++) {
      const row = rentOutRecords[i];
      
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
  console.log(`   💾 Total new records saved: ${totalSaved}`);
  console.log(`   ⏭️  Total skipped (already exists): ${totalSkipped}`);
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

