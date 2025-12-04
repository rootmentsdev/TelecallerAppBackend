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
  
  // Location ID to Store Name mapping (same as rent-out)
  const LOCATION_ID_TO_STORE_NAME = {
    '1': 'Z- Edapally',
    '3': 'SG-Edappally',
    '5': 'Trivandrum',
    '6': 'Z- Edapally',
    '7': 'PMNA',
    '8': 'Z.Kottakkal',
    '9': 'Kottayam',
    '10': 'Perumbavoor',
    '11': 'Trissur',
    '12': 'Chavakkad',
    '13': 'CALICUT',
    '14': 'VATAKARA',
    '15': 'SG-Edappally',
    '16': 'PMNA',
    '17': 'KOTTAKAL',
    '18': 'MANJERY',
    '19': 'Palakkad',
    '20': 'KALPETTA',
    '21': 'KANNUR'
  };
  
  console.log(`\n📍 Fetching booking data using location IDs`);
  console.log(`   Will fetch data for each location separately`);
  
  // Try GetBookingList first, but if it returns empty, use GetBookingReport (which we know works)
  const fallbackUrl = `${baseUrl}/api/Reports/GetBookingReport`;
  const locationIds = Object.keys(LOCATION_ID_TO_STORE_NAME);
  
  let allDataArray = [];
  
  // Try GetBookingList API first (GET request without params returns empty, so skip to fallback)
  console.log(`📡 Trying GetBookingList API first...`);
  
  // Since GET returns empty, directly use the fallback API (GetBookingReport) which we know works
  console.log(`📡 Using GetBookingReport API (known working endpoint)`);
  
  for (const locationId of locationIds) {
    const storeName = LOCATION_ID_TO_STORE_NAME[locationId];
    
    console.log(`\n📍 Processing Location ID: ${locationId} (Store: ${storeName})`);
    
    // Use GetBookingReport API (POST) with locationID
      const requestBody = {
      bookingNo: "",
        dateFrom: dateFrom || "",
        dateTo: dateTo || "",
        userName: "",
        months: months || "",
        fromLocation: "",
        userID: "",
      locationID: locationId,
    };
    
    console.log(`📡 Calling API: ${fallbackUrl}`);
    console.log(`   📤 Location ID: ${locationId}`);
    
    let data = await postAPI(
      fallbackUrl,
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
      console.log(`   ℹ️  No data for location ID ${locationId}`);
      continue;
    }
    
    // Parse response
    let locationData = [];
    if (data.dataSet && Array.isArray(data.dataSet.data)) {
      locationData = data.dataSet.data;
    } else if (Array.isArray(data.dataSet)) {
      locationData = data.dataSet;
    } else if (Array.isArray(data)) {
      locationData = data;
    }
    
    if (locationData.length > 0) {
      // Add store name to each record
      locationData.forEach(row => {
        row.store = storeName;
      });
      allDataArray.push(...locationData);
      console.log(`   ✅ Found ${locationData.length} records for location ID ${locationId}`);
    } else {
      console.log(`   ℹ️  No data for location ID ${locationId}`);
    }
    
    // Small delay between API calls
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  if (allDataArray.length === 0) {
    console.log(`ℹ️  No booking data received from any location`);
    return;
  }
  
  console.log(`\n📊 Found ${allDataArray.length} total records from all locations`);
  console.log(`   Processing records...`);
  console.log(`   This may take a few minutes for large datasets...`);
  
  // Process all collected data with progress indicator
  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const totalRecords = allDataArray.length;
  const progressInterval = Math.max(1, Math.floor(totalRecords / 20)); // Show progress every 5%
  let lastProgressTime = Date.now();
  
  for (let i = 0; i < allDataArray.length; i++) {
    const row = allDataArray[i];
    
    // Show progress every N records
    if (i % progressInterval === 0 || i === allDataArray.length - 1) {
      const progress = ((i + 1) / totalRecords * 100).toFixed(1);
      const elapsed = ((Date.now() - lastProgressTime) / 1000).toFixed(1);
      const rate = progressInterval > 0 ? (progressInterval / (elapsed || 1)).toFixed(0) : 0;
      console.log(`   ⏳ Progress: ${progress}% (${i + 1}/${totalRecords}) | Rate: ~${rate} records/sec | Saved: ${totalSaved}, Skipped: ${totalSkipped}`);
      lastProgressTime = Date.now();
    }
    
    // Store name is already added in the loop above
    const mapped = mapBooking(row);
        if (mapped) {
          const result = await saveToMongo(mapped);
          if (result.saved) {
        totalSaved++;
          } else if (result.skipped) {
        // Record already exists - skipped (not updated)
        totalSkipped++;
          } else {
        totalErrors++;
      }
    } else {
      totalSkipped++;
    }
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
  console.log(`   📊 Locations processed: ${locationIds.length}`);
  console.log(`   💾 Total new records saved: ${totalSaved}`);
  console.log(`   ⏭️  Total skipped (already exists): ${totalSkipped}`);
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

